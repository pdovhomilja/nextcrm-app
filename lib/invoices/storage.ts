import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";

function invoiceKey(invoiceId: string) {
  return `invoices/${invoiceId}.pdf`;
}

export async function uploadInvoicePdf(invoiceId: string, pdf: Buffer): Promise<string> {
  const key = invoiceKey(invoiceId);
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

export async function getInvoicePdfStream(key: string) {
  const res = await minioClient.send(
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }),
  );
  return res.Body;
}

export async function getInvoicePdfPresignedUrl(
  key: string,
  expirySeconds = 300,
): Promise<string> {
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
