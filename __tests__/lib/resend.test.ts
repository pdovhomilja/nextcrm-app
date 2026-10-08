jest.mock("@/lib/prisma", () => ({
  prismadb: {
    systemServices: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";
import {
  encryptResendKey,
  getResendApiKey,
  getResendKeyStatus,
} from "@/lib/resend";

const findFirst = prismadb.systemServices.findFirst as jest.Mock;
const update = prismadb.systemServices.update as jest.Mock;

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, EMAIL_ENCRYPTION_KEY: "a".repeat(64) };
  delete process.env.RESEND_API_KEY;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("encryptResendKey", () => {
  it("does not store the key in plain text", () => {
    const stored = encryptResendKey("re_secret_1234");
    expect(stored).not.toContain("re_secret");
    expect(stored.startsWith("enc:")).toBe(true);
    expect(decrypt(stored.slice(4))).toBe("re_secret_1234");
  });
});

describe("getResendApiKey", () => {
  it("prefers the environment variable", async () => {
    process.env.RESEND_API_KEY = "re_env_key";
    await expect(getResendApiKey()).resolves.toBe("re_env_key");
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("decrypts an encrypted DB key", async () => {
    findFirst.mockResolvedValue({ id: "svc-1", serviceKey: encryptResendKey("re_db_key") });
    await expect(getResendApiKey()).resolves.toBe("re_db_key");
    expect(update).not.toHaveBeenCalled();
  });

  it("returns a legacy plain-text DB key and re-saves it encrypted", async () => {
    findFirst.mockResolvedValue({ id: "svc-1", serviceKey: "re_legacy_key" });
    await expect(getResendApiKey()).resolves.toBe("re_legacy_key");
    expect(update).toHaveBeenCalledTimes(1);
    const saved = update.mock.calls[0][0];
    expect(saved.where).toEqual({ id: "svc-1" });
    expect(saved.data.serviceKey).not.toContain("re_legacy_key");
    expect(decrypt(saved.data.serviceKey.slice(4))).toBe("re_legacy_key");
  });

  it("returns null when no key is configured", async () => {
    findFirst.mockResolvedValue(null);
    await expect(getResendApiKey()).resolves.toBeNull();
  });
});

describe("getResendKeyStatus", () => {
  it("returns only masked values for both the env and the DB key", async () => {
    process.env.RESEND_API_KEY = "re_env_secret_ABCD";
    findFirst.mockResolvedValue({ id: "svc-1", serviceKey: encryptResendKey("re_db_secret_WXYZ") });

    const status = await getResendKeyStatus();

    expect(status).toEqual({ id: "svc-1", envKey: "••••ABCD", dbKey: "••••WXYZ" });
    expect(JSON.stringify(status)).not.toContain("secret");
  });

  it("reports missing keys as null", async () => {
    findFirst.mockResolvedValue(null);
    await expect(getResendKeyStatus()).resolves.toEqual({ id: undefined, envKey: null, dbKey: null });
  });
});
