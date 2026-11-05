import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * URL browsers use to reach the bucket. In Docker MINIO_ENDPOINT is an
 * internal hostname (http://minio:9000) that only the app can resolve, so
 * links and presigned URLs must use the public one.
 */
export function minioPublicEndpoint(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.MINIO_PUBLIC_ENDPOINT ||
    env.NEXT_PUBLIC_MINIO_ENDPOINT ||
    env.MINIO_ENDPOINT ||
    ""
  ).replace(/\/+$/, "");
}

export type MinioConfig = {
  endpoint: string;
  publicEndpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
};

/** Validate storage settings only when an operation actually needs MinIO. */
export function getMinioConfig(env: NodeJS.ProcessEnv = process.env): MinioConfig {
  const missing: string[] = [];

  if (!env.MINIO_ENDPOINT) missing.push("MINIO_ENDPOINT");
  if (!env.MINIO_ACCESS_KEY) missing.push("MINIO_ACCESS_KEY");
  if (!env.MINIO_SECRET_KEY) missing.push("MINIO_SECRET_KEY");
  if (!env.MINIO_BUCKET) missing.push("MINIO_BUCKET");

  if (missing.length) {
    throw new Error(`Object storage is not configured. Missing: ${missing.join(", ")}`);
  }

  return {
    endpoint: env.MINIO_ENDPOINT!,
    publicEndpoint: minioPublicEndpoint(env),
    bucket: env.MINIO_BUCKET!,
    accessKey: env.MINIO_ACCESS_KEY!,
    secretKey: env.MINIO_SECRET_KEY!,
  };
}

function createClient(config: MinioConfig, endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });
}

// Retain these exports for existing callers/tests.
// Runtime operations should use getMinioConfig().
export const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "";
export const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "";
export const MINIO_PUBLIC_URL = minioPublicEndpoint();

let internalClient: S3Client | undefined;
let presignClient: S3Client | undefined;
let internalClientEndpoint: string | undefined;
let presignClientEndpoint: string | undefined;

/** For server-side reads and writes (internal endpoint). */
export function getMinioClient(): S3Client {
  const config = getMinioConfig();

  if (!internalClient || internalClientEndpoint !== config.endpoint) {
    internalClient = createClient(config, config.endpoint);
    internalClientEndpoint = config.endpoint;
  }

  return internalClient;
}

/** For presigned URLs handed to browsers; the signature must match the public host. */
export function getMinioPresignClient(): S3Client {
  const config = getMinioConfig();
  const endpoint = config.publicEndpoint;

  if (endpoint === config.endpoint) return getMinioClient();

  if (!presignClient || presignClientEndpoint !== endpoint) {
    presignClient = createClient(config, endpoint);
    presignClientEndpoint = endpoint;
  }

  return presignClient;
}

/** Short-lived GET link for a private object. Hand it out only after an access check. */
export function presignGet(key: string, expiresIn = 300): Promise<string> {
  const { bucket } = getMinioConfig();

  return getSignedUrl(
    getMinioPresignClient(),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

/** Short-lived PUT link with Content-Type included in the signature. */
export function presignPut(
  key: string,
  contentType: string,
  expiresIn = 600,
): Promise<string> {
  const { bucket } = getMinioConfig();

  return getSignedUrl(
    getMinioPresignClient(),
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn, signableHeaders: new Set(["content-type"]) },
  );
}
