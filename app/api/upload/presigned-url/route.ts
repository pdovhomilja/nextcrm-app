import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, folder = "uploads" } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }

  const ext = filename.split(".").pop();
  const key = `${folder}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: MINIO_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  // Presigned URL valid for 10 minutes
  const presignedUrl = await getSignedUrl(minioClient, command, { expiresIn: 600 });

  // The public URL where the file will be accessible after upload
  const fileUrl = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`;

  return NextResponse.json({ presignedUrl, fileUrl, key });
}
