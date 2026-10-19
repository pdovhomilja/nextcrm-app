import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { minioPresignClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { randomUUID } from "crypto";
import {
  isBlobStorageConfigured,
  isFileUploadConfigured,
  isMinioConfigured,
} from "@/lib/storage/env";
import { resolveUploadContentType } from "@/lib/upload/allowed-content-types";

const ALLOWED_FOLDERS = ["avatars", "images", "documents", "uploads"] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

const BLOB_HANDLE_URL = "/api/upload/blob";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isFileUploadConfigured()) {
    return NextResponse.json(
      {
        error:
          "File storage is not configured. Add MINIO_* (S3-compatible) or connect Vercel Blob (BLOB_READ_WRITE_TOKEN) in Vercel.",
      },
      { status: 503 }
    );
  }

  const { filename: rawFilename, contentType, folder: rawFolder = "uploads" } = await req.json();

  const filename = path.basename(rawFilename ?? "");
  const folder: AllowedFolder = ALLOWED_FOLDERS.includes(rawFolder as AllowedFolder)
    ? (rawFolder as AllowedFolder)
    : "uploads";

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }

  const resolvedContentType = resolveUploadContentType(filename, contentType);
  if (!resolvedContentType) {
    return NextResponse.json({ error: "Content type not allowed" }, { status: 400 });
  }

  if (!isMinioConfigured() && isBlobStorageConfigured()) {
    return NextResponse.json({
      provider: "blob",
      handleUploadUrl: BLOB_HANDLE_URL,
    });
  }

  const ext = filename.includes(".") ? filename.split(".").pop()?.trim() || "bin" : "bin";
  const key = `${folder}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: MINIO_BUCKET,
    Key: key,
    ContentType: resolvedContentType,
  });

  try {
    const presignedUrl = await getSignedUrl(minioPresignClient, command, { expiresIn: 600 });
    const fileUrl = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`;

    return NextResponse.json({
      provider: "s3",
      presignedUrl,
      fileUrl,
      key,
    });
  } catch (err) {
    console.error("Failed to generate presigned URL:", err);
    if (isBlobStorageConfigured()) {
      return NextResponse.json({
        provider: "blob",
        handleUploadUrl: BLOB_HANDLE_URL,
      });
    }
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
