import { generatePresignedPutUrl } from "@/lib/r2-signer";
import { NextResponse } from "next/server";

export const runtime = "edge";

const ADMIN_KEYS = [process.env.ADMIN_KEY, process.env.ADMIN_SECRET_KEY].filter(
  Boolean,
) as string[];

export async function POST(request: Request) {
  try {
    // Security check - validate admin key
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || !ADMIN_KEYS.includes(key)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, contentType, bucket } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields: filename and contentType" },
        { status: 400 },
      );
    }

    // Determine bucket and path based on bucket parameter or filename pattern
    const targetBucket = bucket || "stories";

    // Generate unique file path based on bucket
    let uniqueFilename: string;
    if (targetBucket === "models" || targetBucket === "trans-image-directory") {
      // For gallery items: use filename as-is (already includes model-slug/)
      uniqueFilename = filename;
    } else {
      // For stories: prefix with "stories/"
      uniqueFilename = `stories/${Date.now()}-${filename}`;
    }

    // Determine bucket name
    let bucketName: string;
    if (targetBucket === "models" || targetBucket === "trans-image-directory") {
      bucketName = process.env.R2_BUCKET_NAME || "trans-image-directory";
    } else {
      bucketName = process.env.R2_STORIES_BUCKET_NAME || "stories";
    }

    console.log("Upload bucket selection:", {
      path: uniqueFilename,
      targetBucket,
      R2_STORIES_BUCKET_NAME: process.env.R2_STORIES_BUCKET_NAME,
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
      selectedBucket: bucketName,
    });

    // Generate presigned URL using Edge-compatible signer (no AWS SDK)
    const uploadUrl = await generatePresignedPutUrl({
      bucket: bucketName,
      key: uniqueFilename,
      contentType,
      expiresIn: 60,
    });

    // Construct public URL using the appropriate domain based on bucket
    const publicDomain =
      targetBucket === "models" || targetBucket === "trans-image-directory"
        ? process.env.NEXT_PUBLIC_R2_DOMAIN ||
          process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
          "pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev"
        : process.env.NEXT_PUBLIC_R2_STORIES_DOMAIN ||
          process.env.NEXT_PUBLIC_R2_DOMAIN ||
          "pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev";

    // Ensure domain has https:// prefix if it doesn't already
    const publicUrl = publicDomain.startsWith("http")
      ? `${publicDomain}/${uniqueFilename}`
      : `https://${publicDomain}/${uniqueFilename}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key: uniqueFilename,
    });
  } catch (error) {
    console.error("Upload presign error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
