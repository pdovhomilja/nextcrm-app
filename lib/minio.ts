import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.MINIO_ENDPOINT) throw new Error("MINIO_ENDPOINT is not defined");
if (!process.env.MINIO_ACCESS_KEY) throw new Error("MINIO_ACCESS_KEY is not defined");
if (!process.env.MINIO_SECRET_KEY) throw new Error("MINIO_SECRET_KEY is not defined");
if (!process.env.MINIO_BUCKET) throw new Error("MINIO_BUCKET is not defined");

/**
 * URL browsers use to reach the bucket. In Docker MINIO_ENDPOINT is an
 * internal hostname (http://minio:9000) that only the app can resolve, so
 * links and presigned URLs must use the public one. MINIO_PUBLIC_ENDPOINT is
 * read at runtime; NEXT_PUBLIC_MINIO_ENDPOINT is kept for older setups.
 */
export function minioPublicEndpoint(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.MINIO_PUBLIC_ENDPOINT ||
    env.NEXT_PUBLIC_MINIO_ENDPOINT ||
    env.MINIO_ENDPOINT ||
    ""
  ).replace(/\/+$/, "");
}

function createClient(endpoint: string) {
  return new S3Client({
    endpoint,
    region: "us-east-1", // MinIO requires a region value; actual value doesn't matter
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    forcePathStyle: true, // REQUIRED for MinIO — without this, SDK uses virtual-hosted-style which breaks
  });
}

export const MINIO_BUCKET = process.env.MINIO_BUCKET;
export const MINIO_PUBLIC_URL = minioPublicEndpoint();

/** For server-side reads and writes (internal endpoint). */
export const minioClient = createClient(process.env.MINIO_ENDPOINT);

/**
 * For presigned URLs handed to browsers. A SigV4 signature covers the host,
 * so the URL must be signed for the endpoint the browser will call. Signing
 * makes no network request, so the app never has to reach this endpoint.
 */
export const minioPresignClient =
  MINIO_PUBLIC_URL === process.env.MINIO_ENDPOINT ? minioClient : createClient(MINIO_PUBLIC_URL);
