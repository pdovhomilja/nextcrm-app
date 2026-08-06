import { S3Client } from "@aws-sdk/client-s3";

let _minioClient: S3Client | undefined;

function getMinioClient(): S3Client {
  if (_minioClient) return _minioClient;
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKeyId = process.env.MINIO_ACCESS_KEY;
  const secretAccessKey = process.env.MINIO_SECRET_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "MINIO_ENDPOINT, MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be defined to use object storage",
    );
  }
  _minioClient = new S3Client({
    endpoint,
    region: "us-east-1", // MinIO requires a region value; actual value doesn't matter
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true, // REQUIRED for MinIO — without this, SDK uses virtual-hosted-style which breaks
  });
  return _minioClient;
}

export const minioClient = new Proxy({} as S3Client, {
  get(_target, prop: string | symbol) {
    const client = getMinioClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET;

export function isMinioConfigured(): boolean {
  return Boolean(
    process.env.MINIO_ENDPOINT &&
      process.env.MINIO_ACCESS_KEY &&
      process.env.MINIO_SECRET_KEY &&
      process.env.MINIO_BUCKET
  );
}

export const MINIO_PUBLIC_URL = process.env.NEXT_PUBLIC_MINIO_ENDPOINT;
