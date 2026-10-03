import { S3Client } from "@aws-sdk/client-s3";

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "nextcrm-bucket";
export const MINIO_PUBLIC_URL = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "http://localhost:9000";

export const minioClient = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  region: "us-east-1", // MinIO requires a region value; actual value doesn't matter
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  },
  forcePathStyle: true, // REQUIRED for MinIO — without this, SDK uses virtual-hosted-style which breaks
});

