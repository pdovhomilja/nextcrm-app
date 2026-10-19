import { GetObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { isMinioConfigured } from "@/lib/storage/env";

/** Load a file uploaded via app storage (MinIO / S3-compatible or public HTTPS URL). */
export async function fetchUploadBuffer(fileUrl: string): Promise<Buffer> {
  const prefix =
    isMinioConfigured() && MINIO_PUBLIC_URL && MINIO_BUCKET
      ? `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/`
      : null;

  if (prefix && fileUrl.startsWith(prefix)) {
    const key = fileUrl.slice(prefix.length);
    if (!key || key.includes("..")) throw new Error("Invalid attachment key");

    const out = await minioClient.send(
      new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key })
    );
    const bytes = await out.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty attachment");
    return Buffer.from(bytes);
  }

  let parsed: URL;
  try {
    parsed = new URL(fileUrl);
  } catch {
    throw new Error("Invalid attachment URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Attachment URL must use HTTPS");
  }

  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to download attachment (${res.status})`);
  }
  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength) throw new Error("Empty attachment");
  return Buffer.from(bytes);
}
