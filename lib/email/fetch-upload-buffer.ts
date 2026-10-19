import { GetObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";

/** Load a file previously uploaded via /api/upload/presigned-url (MinIO / S3-compatible). */
export async function fetchUploadBuffer(fileUrl: string): Promise<Buffer> {
  const prefix = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/`;
  if (!fileUrl.startsWith(prefix)) {
    throw new Error("Attachment URL is not from this app storage");
  }
  const key = fileUrl.slice(prefix.length);
  if (!key || key.includes("..")) throw new Error("Invalid attachment key");

  const out = await minioClient.send(
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key })
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty attachment");
  return Buffer.from(bytes);
}
