import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { isBlobStorageConfigured, isMinioConfigured } from "@/lib/storage/env";
import type { EmailStoredAttachment } from "@/lib/email/attachment-types";

/** Store raw bytes in app storage (Blob or MinIO) for long-lived email attachment links. */
export async function persistAttachmentBuffer(
  filename: string,
  mime: string,
  buffer: Buffer
): Promise<EmailStoredAttachment> {
  const safeName = filename.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180) || "attachment";
  const ext = safeName.includes(".") ? safeName.split(".").pop()?.trim() || "bin" : "bin";
  const key = `uploads/${randomUUID()}.${ext}`;

  if (isMinioConfigured() && MINIO_BUCKET && MINIO_PUBLIC_URL) {
    await minioClient.send(
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mime,
      })
    );
    return {
      url: `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`,
      name: safeName,
      mime,
      size: buffer.length,
    };
  }

  if (isBlobStorageConfigured()) {
    const blob = await put(key, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      name: safeName,
      mime,
      size: buffer.length,
    };
  }

  throw new Error("File storage is not configured");
}
