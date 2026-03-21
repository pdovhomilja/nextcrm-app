import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.MINIO_ENDPOINT) throw new Error("MINIO_ENDPOINT is not defined");
if (!process.env.MINIO_ACCESS_KEY) throw new Error("MINIO_ACCESS_KEY is not defined");
if (!process.env.MINIO_SECRET_KEY) throw new Error("MINIO_SECRET_KEY is not defined");
if (!process.env.MINIO_BUCKET) throw new Error("MINIO_BUCKET is not defined");

export const minioClient = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: "us-east-1", // MinIO requires a region value; actual value doesn't matter
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // REQUIRED for MinIO — without this, SDK uses virtual-hosted-style which breaks
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET;
export const MINIO_PUBLIC_URL = process.env.NEXT_PUBLIC_MINIO_ENDPOINT;
