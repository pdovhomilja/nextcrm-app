import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";

export const homepageHtmlKey = (slug: string) => `previews/${slug}/index.html`;
export const homepageShotKey = (slug: string) => `previews/${slug}/screenshot.png`;

export async function putHomepageHtml(slug: string, html: string): Promise<void> {
  await minioClient.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET, Key: homepageHtmlKey(slug), Body: html,
    ContentType: "text/html; charset=utf-8",
  }));
}

export async function putHomepageScreenshot(slug: string, png: Buffer): Promise<void> {
  await minioClient.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET, Key: homepageShotKey(slug), Body: png, ContentType: "image/png",
  }));
}

async function getBuffer(key: string): Promise<Buffer | null> {
  try {
    const res = await minioClient.send(new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const c of res.Body as AsyncIterable<Uint8Array>) chunks.push(c);
    return Buffer.concat(chunks);
  } catch (e) {
    if ((e as { name?: string }).name === "NoSuchKey" || (e as { name?: string }).name === "NotFound") return null;
    throw e;
  }
}

export async function getHomepageHtml(slug: string): Promise<string | null> {
  const b = await getBuffer(homepageHtmlKey(slug));
  return b ? b.toString("utf-8") : null;
}

export async function getHomepageScreenshotBuffer(slug: string): Promise<Buffer | null> {
  return getBuffer(homepageShotKey(slug));
}
