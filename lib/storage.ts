import { promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  minioClient,
  MINIO_BUCKET,
  MINIO_PUBLIC_URL,
  isMinioConfigured,
} from "@/lib/minio";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".storage");

export function assertSafeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) throw new Error("Storage key must not be empty");
  for (const part of parts) {
    if (part === "." || part === ".." || part.includes("\0")) {
      throw new Error("Storage key must not contain path traversal");
    }
  }
  return parts.join("/");
}

function localKeyToPath(key: string): string {
  const safe = assertSafeKey(key);
  return path.join(LOCAL_STORAGE_DIR, ...safe.split("/"));
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string,
): Promise<string> {
  const safeKey = assertSafeKey(key);
  if (isMinioConfigured()) {
    await minioClient.send(
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: safeKey,
        Body: body,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
    );
    return safeKey;
  }
  const filePath = localKeyToPath(safeKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
  return safeKey;
}

export async function getObjectStream(key: string): Promise<AsyncIterable<Uint8Array>> {
  const safeKey = assertSafeKey(key);
  if (isMinioConfigured()) {
    const res = await minioClient.send(
      new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: safeKey }),
    );
    return res.Body as AsyncIterable<Uint8Array>;
  }
  const buf = await fs.readFile(localKeyToPath(safeKey));
  return Readable.from([buf]);
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const stream = await getObjectStream(key);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteObject(key: string): Promise<void> {
  if (!key) return;
  const safeKey = assertSafeKey(key);
  if (isMinioConfigured()) {
    await minioClient.send(
      new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: safeKey }),
    );
    return;
  }
  try {
    await fs.unlink(localKeyToPath(safeKey));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export async function getObjectUploadUrl(
  key: string,
  contentType?: string,
  expiresIn = 600,
): Promise<string> {
  const safeKey = assertSafeKey(key);
  if (isMinioConfigured()) {
    return getSignedUrl(
      minioClient,
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: safeKey,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
      { expiresIn },
    );
  }
  return `/api/upload/local?key=${encodeURIComponent(safeKey)}`;
}

export async function getObjectDownloadUrl(
  key: string,
  expiresIn = 600,
): Promise<string> {
  const safeKey = assertSafeKey(key);
  if (isMinioConfigured()) {
    return getSignedUrl(
      minioClient,
      new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: safeKey }),
      { expiresIn },
    );
  }
  return `/api/files/${safeKey}`;
}

export function getObjectPublicUrl(key: string): string {
  const safeKey = assertSafeKey(key);
  if (isMinioConfigured()) {
    return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${safeKey}`;
  }
  return `/api/files/${safeKey}`;
}
