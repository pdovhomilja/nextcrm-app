import { promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { minioClient, MINIO_BUCKET, isMinioConfigured } from "@/lib/minio";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".storage", "invoices");

function invoiceKey(invoiceId: string) {
  return `invoices/${invoiceId}.pdf`;
}

function localKeyToPath(key: string) {
  return path.join(LOCAL_STORAGE_DIR, path.basename(key));
}

export async function uploadInvoicePdf(invoiceId: string, pdf: Buffer): Promise<string> {
  const key = invoiceKey(invoiceId);
  if (isMinioConfigured()) {
    await minioClient.send(
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        Body: pdf,
        ContentType: "application/pdf",
      }),
    );
    return key;
  }
  await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  await fs.writeFile(localKeyToPath(key), pdf);
  return key;
}

export async function getInvoicePdfStream(key: string): Promise<AsyncIterable<Uint8Array>> {
  if (isMinioConfigured()) {
    const res = await minioClient.send(
      new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }),
    );
    return res.Body as AsyncIterable<Uint8Array>;
  }
  const buf = await fs.readFile(localKeyToPath(key));
  return Readable.from([buf]);
}

export async function getInvoicePdfPresignedUrl(
  key: string,
  expirySeconds = 300,
): Promise<string | null> {
  if (!isMinioConfigured()) return null;
  return getSignedUrl(
    minioClient,
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }),
    { expiresIn: expirySeconds },
  );
}

export async function uploadInvoiceAttachment(
  invoiceId: string,
  attachmentId: string,
  buf: Buffer,
  mime: string,
): Promise<string> {
  const key = `invoices/${invoiceId}/attachments/${attachmentId}`;
  if (isMinioConfigured()) {
    await minioClient.send(
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        Body: buf,
        ContentType: mime,
      }),
    );
    return key;
  }
  await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  await fs.writeFile(localKeyToPath(key), buf);
  return key;
}
