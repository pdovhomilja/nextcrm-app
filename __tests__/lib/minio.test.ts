import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const ENV_KEYS = [
  "MINIO_ENDPOINT",
  "MINIO_PUBLIC_ENDPOINT",
  "NEXT_PUBLIC_MINIO_ENDPOINT",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "MINIO_BUCKET",
];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function loadMinio(env: Record<string, string>) {
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, {
    MINIO_ENDPOINT: "http://minio:9000",
    MINIO_ACCESS_KEY: "key",
    MINIO_SECRET_KEY: "secret",
    MINIO_BUCKET: "nextcrm",
    ...env,
  });
  let mod!: typeof import("@/lib/minio");
  jest.isolateModules(() => {
    mod = require("@/lib/minio");
  });
  return mod;
}

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("minioPublicEndpoint", () => {
  it("prefers MINIO_PUBLIC_ENDPOINT, then NEXT_PUBLIC_MINIO_ENDPOINT, then MINIO_ENDPOINT", () => {
    const { minioPublicEndpoint } = loadMinio({});
    expect(
      minioPublicEndpoint({
        MINIO_PUBLIC_ENDPOINT: "https://files.example.com/",
        NEXT_PUBLIC_MINIO_ENDPOINT: "https://old.example.com",
        MINIO_ENDPOINT: "http://minio:9000",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("https://files.example.com");
    expect(
      minioPublicEndpoint({
        NEXT_PUBLIC_MINIO_ENDPOINT: "https://old.example.com",
        MINIO_ENDPOINT: "http://minio:9000",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("https://old.example.com");
    expect(
      minioPublicEndpoint({ MINIO_ENDPOINT: "http://minio:9000" } as unknown as NodeJS.ProcessEnv),
    ).toBe("http://minio:9000");
  });
});

describe("minioPresignClient", () => {
  it("signs browser URLs for the public endpoint, not the internal one", async () => {
    const { minioPresignClient, MINIO_PUBLIC_URL } = loadMinio({
      MINIO_PUBLIC_ENDPOINT: "https://files.example.com",
    });
    expect(MINIO_PUBLIC_URL).toBe("https://files.example.com");
    const url = await getSignedUrl(
      minioPresignClient,
      new PutObjectCommand({ Bucket: "nextcrm", Key: "uploads/a.png" }),
      { expiresIn: 60 },
    );
    expect(url.startsWith("https://files.example.com/nextcrm/uploads/a.png?")).toBe(true);
  });

  it("reuses the internal client when no public endpoint is set", () => {
    const { minioPresignClient, minioClient } = loadMinio({});
    expect(minioPresignClient).toBe(minioClient);
  });
});
