import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { randomUUID } from "crypto";

const ALLOWED_FOLDERS = ["avatars", "images", "documents", "uploads"] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename: rawFilename, contentType, folder: rawFolder = "uploads" } = await req.json();

  // Sanitize: strip any path components to prevent path traversal
  const filename = path.basename(rawFilename ?? "");
  // Whitelist folder to only allow known upload destinations
  const folder: AllowedFolder = ALLOWED_FOLDERS.includes(rawFolder as AllowedFolder)
    ? (rawFolder as AllowedFolder)
    : "uploads";

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }

  // Fall back to "bin" if filename has no extension
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  const key = `${folder}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: MINIO_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  // Presigned URL valid for 10 minutes
  try {
    const presignedUrl = await getSignedUrl(minioClient, command, { expiresIn: 600 });

    // The public URL where the file will be accessible after upload
    const fileUrl = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`;

    return NextResponse.json({ presignedUrl, fileUrl, key });
  } catch (err) {
    console.error("Failed to generate presigned URL:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
