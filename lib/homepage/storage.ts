import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";

export const homepageHtmlKey = (slug: string) => `previews/${slug}/index.html`;
export const homepageShotKey = (slug: string) => `previews/${slug}/screenshot.png`;

// Transient (job-scoped) source screenshot from the harvest step. Lives under
// previews/<slug>/tmp/ so it never collides with the served keys; it keeps the
// base64 PNG out of Inngest's persisted step state. Best-effort deleted after the run.
export const homepageTmpSourceKey = (slug: string) => `previews/${slug}/tmp/source.png`;

export async function putHomepageTmpSource(slug: string, png: Buffer): Promise<void> {
  await minioClient.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET, Key: homepageTmpSourceKey(slug), Body: png, ContentType: "image/png",
  }));
}

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

async function getObject(key: string): Promise<{ buffer: Buffer; contentType?: string } | null> {
  try {
    const res = await minioClient.send(new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const c of res.Body as AsyncIterable<Uint8Array>) chunks.push(c);
    return { buffer: Buffer.concat(chunks), contentType: res.ContentType };
  } catch (e) {
    if ((e as { name?: string }).name === "NoSuchKey" || (e as { name?: string }).name === "NotFound") return null;
    throw e;
  }
}

async function getBuffer(key: string): Promise<Buffer | null> {
  return (await getObject(key))?.buffer ?? null;
}

export async function getHomepageHtml(slug: string): Promise<string | null> {
  const b = await getBuffer(homepageHtmlKey(slug));
  return b ? b.toString("utf-8") : null;
}

export async function getHomepageScreenshotBuffer(slug: string): Promise<Buffer | null> {
  return getBuffer(homepageShotKey(slug));
}

export async function getHomepageTmpSource(slug: string): Promise<Buffer | null> {
  return getBuffer(homepageTmpSourceKey(slug));
}

export async function deleteHomepageTmpSource(slug: string): Promise<void> {
  await minioClient.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: homepageTmpSourceKey(slug) }));
}

// Transient (job-scoped) uploaded HTML for the upload-override flow. Lives under
// previews/<slug>/tmp/ so it never collides with the served keys; it is read,
// rendered, then best-effort deleted.
export const homepageUploadKey = (slug: string) => `previews/${slug}/tmp/upload.html`;

export async function putHomepageUpload(slug: string, html: string): Promise<void> {
  await minioClient.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET, Key: homepageUploadKey(slug), Body: html,
    ContentType: "text/html; charset=utf-8",
  }));
}

export async function getHomepageUpload(slug: string): Promise<string | null> {
  const b = await getBuffer(homepageUploadKey(slug));
  return b ? b.toString("utf-8") : null;
}

export async function deleteHomepageUpload(slug: string): Promise<void> {
  await minioClient.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: homepageUploadKey(slug) }));
}

// AI-generated section/hero images. Providers return different formats (Higgsfield
// SOUL = JPEG, OpenAI = PNG, others may be WebP), so the content-type is detected
// from the bytes at store time and read back from the object at serve time.
export const homepageImageKey = (slug: string, name: string) => `previews/${slug}/images/${name}`;

/** Sniff an image's MIME type from its magic bytes; octet-stream if unrecognised. */
export function detectImageContentType(buf: Buffer): string {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  return "application/octet-stream";
}

export async function putHomepageImage(slug: string, name: string, bytes: Buffer): Promise<void> {
  await minioClient.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET, Key: homepageImageKey(slug, name), Body: bytes,
    ContentType: detectImageContentType(bytes),
  }));
}

/** Image bytes plus their real content-type (stored metadata, else sniffed). */
export async function getHomepageImage(
  slug: string, name: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const obj = await getObject(homepageImageKey(slug, name));
  if (!obj) return null;
  return { buffer: obj.buffer, contentType: obj.contentType || detectImageContentType(obj.buffer) };
}

export async function getHomepageImageBuffer(slug: string, name: string): Promise<Buffer | null> {
  return getBuffer(homepageImageKey(slug, name));
}

/** Public URL of a stored image; absolute when NEXT_PUBLIC_PREVIEWS_BASE_URL is set (mirrors previewUrls). */
export function homepageImageUrl(slug: string, name: string): string {
  const base = process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL?.replace(/\/+$/, "");
  return base ? `${base}/p/${slug}/images/${name}` : `/p/${slug}/images/${name}`;
}
