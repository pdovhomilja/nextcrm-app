import { getMinioConfig, minioPublicEndpoint } from "../minio";

describe("MinIO configuration", () => {
  it("allows the module to be imported without storage environment variables", () => {
    expect(() => getMinioConfig({} as unknown as NodeJS.ProcessEnv)).toThrow(
      "Object storage is not configured. Missing: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET",
    );
  });

  it("returns the configured storage settings", () => {
    const config = getMinioConfig({
      MINIO_ENDPOINT: "http://minio:9000",
      MINIO_PUBLIC_ENDPOINT: "https://files.example/",
      MINIO_ACCESS_KEY: "test-access-key",
      MINIO_SECRET_KEY: "test-secret-key",
      MINIO_BUCKET: "nextcrm",
    } as unknown as NodeJS.ProcessEnv);

    expect(config).toEqual({
      endpoint: "http://minio:9000",
      publicEndpoint: "https://files.example",
      accessKey: "test-access-key",
      secretKey: "test-secret-key",
      bucket: "nextcrm",
    });
  });

  it("uses the public endpoint fallback and removes trailing slashes", () => {
    expect(
      minioPublicEndpoint({
        NEXT_PUBLIC_MINIO_ENDPOINT: "https://public.example///",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("https://public.example");
  });
});
