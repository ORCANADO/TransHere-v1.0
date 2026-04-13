import { uploadToR2 } from "@/lib/r2-signer";
import { NextResponse } from "next/server";

export const runtime = "edge";

const ADMIN_KEYS = [process.env.ADMIN_KEY, process.env.ADMIN_SECRET_KEY].filter(
  Boolean,
) as string[];

// POST - Proxy upload to R2 (Edge-compatible, no AWS SDK)
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
        { status: 400 },
      );
    }

    // Determine bucket and path
    const targetBucket = bucket || "stories";
    if (targetBucket === "models" || targetBucket === "trans-image-directory") {
      uniqueFilename = filename;
    } else {
      uniqueFilename = `stories/${Date.now()}-${filename}`;
    }

    // Determine bucket name
    if (targetBucket === "models" || targetBucket === "trans-image-directory") {
      bucketName = process.env.R2_BUCKET_NAME || "trans-image-directory";
    } else {
      bucketName = process.env.R2_STORIES_BUCKET_NAME || "stories";
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

    // Upload directly to R2 using Edge-compatible signer
    const result = await uploadToR2({
      bucket: bucketName,
      key: uniqueFilename,
      body: uint8Array,
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    });

    if (!result.success) {
      throw new Error(
        `R2 upload failed: ${result.status} ${result.statusText} — ${result.errorBody?.substring(0, 200) || "no body"}`,
      );
    }

    console.log("R2 upload successful:", {
      bucket: bucketName,
      key: uniqueFilename,
    });

    // Construct public URL
    const publicDomain =
      targetBucket === "models" || targetBucket === "trans-image-directory"
        ? process.env.NEXT_PUBLIC_R2_DOMAIN ||
          process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
          "pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev"
        : process.env.NEXT_PUBLIC_R2_STORIES_DOMAIN ||
          process.env.NEXT_PUBLIC_R2_DOMAIN ||
          "pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev";

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
      { status: 500 },
    );
  }
}
