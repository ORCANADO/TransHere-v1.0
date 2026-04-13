/**
 * Edge-compatible S3 Signature V4 signer for Cloudflare R2.
 *
 * Replaces @aws-sdk/s3-request-presigner which depends on DOMParser
 * (unavailable in Cloudflare Edge Runtime). Uses only Web Crypto API.
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
 * @see DECISION_LOG.md DL-011
 */

const ALGORITHM = "AWS4-HMAC-SHA256";
const SERVICE = "s3";
const REGION = "auto"; // Cloudflare R2 uses 'auto'
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";

/** HMAC-SHA256 using Web Crypto API */
async function hmacSha256(
  key: ArrayBuffer,
  message: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message),
  );
}

/** SHA-256 hex digest */
async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return bufferToHex(hash);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Format Date to YYYYMMDD */
function toDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Format Date to ISO 8601 basic format: YYYYMMDDTHHMMSSZ */
function toAmzDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * URI-encode per AWS S3 Signature V4 spec.
 * Uses encodeURIComponent for proper UTF-8 handling, then adjusts for AWS conventions.
 */
function uriEncode(str: string, encodeSlash = true): string {
  // encodeURIComponent encodes everything except: A-Z a-z 0-9 - _ . ! ~ * ' ( )
  // AWS S3 unreserved chars: A-Z a-z 0-9 - _ . ~
  // So we need to additionally encode: ! * ' ( )
  let encoded = encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");

  // If we should NOT encode slashes, decode them back
  if (!encodeSlash) {
    encoded = encoded.replace(/%2F/gi, "/");
  }

  return encoded;
}

/** Derive the signing key: AWS4 + secret → date → region → service → aws4_request */
async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(
    new TextEncoder().encode("AWS4" + secretKey).buffer as ArrayBuffer,
    dateStamp,
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Full endpoint URL. If omitted, constructed from accountId. */
  endpoint?: string;
}

function getR2Config(): R2Config {
  return {
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    endpoint: process.env.R2_ENDPOINT,
  };
}

function getEndpoint(config: R2Config): string {
  return (
    config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`
  );
}

/**
 * Generate a presigned PUT URL for uploading to R2.
 * The client can then PUT the file directly to this URL.
 */
export async function generatePresignedPutUrl(params: {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const { bucket, key, contentType, expiresIn = 60 } = params;
  const config = getR2Config();
  const endpoint = getEndpoint(config);
  const host = new URL(endpoint).host;
  const now = new Date();
  const dateStamp = toDateStamp(now);
  const amzDate = toAmzDate(now);
  const credential = `${config.accessKeyId}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  // Canonical query string (alphabetically sorted)
  const queryParams = new Map<string, string>([
    ["X-Amz-Algorithm", ALGORITHM],
    ["X-Amz-Content-Sha256", UNSIGNED_PAYLOAD],
    ["X-Amz-Credential", credential],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresIn)],
    ["X-Amz-SignedHeaders", "content-type;host"],
  ]);

  const canonicalQueryString = [...queryParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`)
    .join("&");

  // Canonical headers (lowercase, sorted)
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = "content-type;host";

  // Canonical request
  const canonicalPath = `/${bucket}/${uriEncode(key, false)}`;
  const canonicalRequest = [
    "PUT",
    canonicalPath,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    UNSIGNED_PAYLOAD,
  ].join("\n");

  // String to sign
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    ALGORITHM,
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  // Signature
  const signingKey = await getSigningKey(
    config.secretAccessKey,
    dateStamp,
    REGION,
    SERVICE,
  );
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = bufferToHex(signatureBuffer);

  // Assemble presigned URL
  return `${endpoint}/${bucket}/${uriEncode(key, false)}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

/**
 * Upload a file directly to R2 using a signed PUT request.
 * Used by the proxy route — the Edge function receives the file and PUTs it to R2.
 */
export async function uploadToR2(params: {
  bucket: string;
  key: string;
  body: ArrayBuffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<{
  success: boolean;
  status: number;
  statusText: string;
  errorBody?: string;
}> {
  const { bucket, key, body, contentType, cacheControl } = params;
  const config = getR2Config();
  const endpoint = getEndpoint(config);
  const host = new URL(endpoint).host;
  const now = new Date();
  const dateStamp = toDateStamp(now);
  const amzDate = toAmzDate(now);

  // For direct upload we use UNSIGNED-PAYLOAD (body is opaque to signing)
  const payloadHash = UNSIGNED_PAYLOAD;

  // Build headers to sign — must include host for canonical request,
  // but we also explicitly send it so it matches what we signed.
  const headerEntries: [string, string][] = [
    ["content-type", contentType],
    ["host", host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ];
  if (cacheControl) {
    headerEntries.push(["cache-control", cacheControl]);
  }
  headerEntries.sort(([a], [b]) => a.localeCompare(b));

  const signedHeaders = headerEntries.map(([k]) => k).join(";");
  const canonicalHeaders = headerEntries
    .map(([k, v]) => `${k}:${v}\n`)
    .join("");

  // Canonical request
  const canonicalPath = `/${bucket}/${uriEncode(key, false)}`;
  const canonicalRequest = [
    "PUT",
    canonicalPath,
    "", // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // String to sign
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    ALGORITHM,
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  // Signature
  const signingKey = await getSigningKey(
    config.secretAccessKey,
    dateStamp,
    REGION,
    SERVICE,
  );
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = bufferToHex(signatureBuffer);

  const credential = `${config.accessKeyId}/${scope}`;
  const authorization = `${ALGORITHM} Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Build fetch headers — include Host explicitly to match signed value.
  // Cloudflare Workers allow setting Host on outbound fetch.
  const fetchHeaders: Record<string, string> = {
    Host: host,
    "Content-Type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: authorization,
  };
  if (cacheControl) {
    fetchHeaders["Cache-Control"] = cacheControl;
  }

  const url = `${endpoint}/${bucket}/${uriEncode(key, false)}`;

  // Log for debugging
  console.log("[R2 Signer] Upload request:", {
    url,
    host,
    contentType,
    amzDate,
    signedHeaders,
    authPrefix: authorization.substring(0, 80) + "...",
    bodySize: body instanceof Uint8Array ? body.length : body.byteLength,
  });

  // Convert to ArrayBuffer — new Uint8Array(source) copies data, guaranteeing a plain ArrayBuffer
  const bodyBuffer =
    body instanceof Uint8Array ? new Uint8Array(body).buffer : body;

  const response = await fetch(url, {
    method: "PUT",
    headers: fetchHeaders,
    body: bodyBuffer as BodyInit,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[R2 Signer] Upload failed:", {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorBody.substring(0, 500),
    });
    return {
      success: false,
      status: response.status,
      statusText: response.statusText,
      errorBody,
    };
  }

  return {
    success: true,
    status: response.status,
    statusText: response.statusText,
  };
}
