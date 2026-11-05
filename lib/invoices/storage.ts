import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getMinioClient, getMinioConfig, presignGet } from "@/lib/minio";

function invoiceKey(invoiceId: string) {
  return `invoices/${invoiceId}.pdf`;
}

export async function uploadInvoicePdf(invoiceId: string, pdf: Buffer): Promise<string> {
  const { bucket } = getMinioConfig();
  const key = invoiceKey(invoiceId);

  await getMinioClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdf,
      ContentType: "application/pdf",
    }),
  );

  return key;
}

export async function getInvoicePdfStream(key: string) {
  const { bucket } = getMinioConfig();

  const res = await getMinioClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  return res.Body;
}

export async function getInvoicePdfPresignedUrl(
  key: string,
  expirySeconds = 300,
): Promise<string> {
  return presignGet(key, expirySeconds);
}

export async function uploadInvoiceAttachment(
  invoiceId: string,
  attachmentId: string,
  buf: Buffer,
  mime: string,
): Promise<string> {
  const { bucket } = getMinioConfig();
  const key = `invoices/${invoiceId}/attachments/${attachmentId}`;

  await getMinioClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: mime,
    }),
  );

  return key;
}
