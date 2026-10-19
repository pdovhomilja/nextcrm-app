import { minioPublicEndpoint } from "@/lib/minio";

export function isMinioConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.MINIO_ACCESS_KEY?.trim() &&
      env.MINIO_SECRET_KEY?.trim() &&
      env.MINIO_BUCKET?.trim() &&
      minioPublicEndpoint(env)
  );
}

export function isBlobStorageConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function isFileUploadConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return isMinioConfigured(env) || isBlobStorageConfigured(env);
}
