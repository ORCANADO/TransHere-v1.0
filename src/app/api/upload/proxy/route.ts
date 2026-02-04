import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const runtime = "edge";

const ADMIN_KEYS = [
  process.env.ADMIN_KEY,
  process.env.ADMIN_SECRET_KEY
].filter(Boolean) as string[];

// Initialize S3Client for Cloudflare R2 (only for presigned URLs)
function getS3Client() {
  const endpoint = process.env.R2_ENDPOINT 
    || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// POST - Proxy upload to R2 (avoids CORS issues)
export async function POST(request: Request) {
  let bucketName: string | undefined;
  let uniqueFilename: string | undefined;
  
  try {
    // Security check
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || !ADMIN_KEYS.includes(key)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const filename = formData.get("filename") as string;
    const contentType = formData.get("contentType") as string;
    const bucket = formData.get("bucket") as string;

    if (!file || !filename || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields: file, filename, contentType" },
        { status: 400 }
      );
    }

    // Determine bucket and path
    const targetBucket = bucket || 'stories';
    if (targetBucket === 'models' || targetBucket === 'trans-image-directory') {
      uniqueFilename = filename;
    } else {
      uniqueFilename = `stories/${Date.now()}-${filename}`;
    }

    // Determine bucket name
    if (targetBucket === 'models' || targetBucket === 'trans-image-directory') {
      bucketName = process.env.R2_BUCKET_NAME || 'trans-image-directory';
    } else {
      bucketName = process.env.R2_STORIES_BUCKET_NAME || 'stories';
    }

    // Convert File to ArrayBuffer (Edge runtime compatible)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log("Attempting R2 upload:", {
      bucket: bucketName,
      key: uniqueFilename,
      contentType,
      fileSize: uint8Array.length,
      hasCredentials: !!process.env.R2_ACCESS_KEY_ID,
    });
    
    // Generate presigned URL (this uses AWS SDK but doesn't trigger DOMParser)
    const s3Client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFilename,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    
    // Upload using fetch (avoids AWS SDK DOMParser issues)
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: uint8Array,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `R2 upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText.substring(0, 200)}`
      );
    }
    
    console.log("R2 upload successful:", { bucket: bucketName, key: uniqueFilename });

    // Construct public URL
    const publicDomain = (targetBucket === 'models' || targetBucket === 'trans-image-directory')
      ? process.env.NEXT_PUBLIC_R2_DOMAIN || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev"
      : process.env.NEXT_PUBLIC_R2_STORIES_DOMAIN || process.env.NEXT_PUBLIC_R2_DOMAIN || "pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev";
    
    const publicUrl = publicDomain.startsWith("http")
      ? `${publicDomain}/${uniqueFilename}`
      : `https://${publicDomain}/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      key: uniqueFilename,
      publicUrl,
    });
  } catch (error) {
    // Extract error message safely
    let errorMessage = "Internal Server Error";
    
    if (error instanceof Error) {
      errorMessage = error.message || "Internal Server Error";
      console.error("Upload error:", errorMessage);
    } else {
      errorMessage = String(error);
      console.error("Unknown error type:", error);
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
