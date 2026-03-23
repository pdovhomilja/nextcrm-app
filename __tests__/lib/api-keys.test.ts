/**
 * Tests for the 3-tier API key resolver.
 * Priority: ENV variable → SYSTEM key in DB → USER key in DB → null
 */
import { getApiKey } from "@/lib/api-keys";
import { prismadb } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/email-crypto";

// Mock prismadb to avoid real DB calls
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    apiKeys: {
      findFirst: jest.fn(),
    },
  },
}));

// Mock email-crypto so we don't need EMAIL_ENCRYPTION_KEY in tests
jest.mock("@/lib/email-crypto", () => ({
  encrypt: jest.fn((s: string) => `enc:${s}`),
  decrypt: jest.fn((s: string) => s.replace("enc:", "")),
}));

const mockFindFirst = prismadb.apiKeys.findFirst as jest.Mock;

const TEST_USER_ID = "user-123";

beforeEach(() => {
  jest.clearAllMocks();
  // Clear any env vars set in previous tests
  delete process.env.OPENAI_API_KEY;
  delete process.env.FIRECRAWL_API_KEY;
});

describe("getApiKey — tier 1: ENV variable", () => {
  it("returns ENV value immediately when set, skipping DB", async () => {
    process.env.OPENAI_API_KEY = "env-key-abc";
    const result = await getApiKey("OPENAI", TEST_USER_ID);
    expect(result).toBe("env-key-abc");
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("maps providers to correct env var names", async () => {
    process.env.FIRECRAWL_API_KEY = "fc-key-xyz";
    const result = await getApiKey("FIRECRAWL", TEST_USER_ID);
    expect(result).toBe("fc-key-xyz");
  });
});

describe("getApiKey — tier 2: SYSTEM key in DB", () => {
  it("returns decrypted system key when no ENV set", async () => {
    mockFindFirst
      .mockResolvedValueOnce({ encryptedKey: "enc:system-key" }); // system lookup — returns early, user lookup not reached

    const result = await getApiKey("OPENAI", TEST_USER_ID);
    expect(result).toBe("system-key");
    // Should have queried for SYSTEM scope first
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scope: "SYSTEM", provider: "OPENAI" }),
      })
    );
  });
});

describe("getApiKey — tier 3: USER key in DB", () => {
  it("returns decrypted user key when no ENV and no system key", async () => {
    mockFindFirst
      .mockResolvedValueOnce(null) // system lookup → not found
      .mockResolvedValueOnce({ encryptedKey: "enc:user-key" }); // user lookup

    const result = await getApiKey("OPENAI", TEST_USER_ID);
    expect(result).toBe("user-key");
  });

  it("skips user lookup when userId not provided", async () => {
    mockFindFirst.mockResolvedValueOnce(null); // system lookup

    const result = await getApiKey("OPENAI");
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledTimes(1); // only system lookup
  });
});

describe("getApiKey — tier 4: null", () => {
  it("returns null when no key found at any tier", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await getApiKey("OPENAI", TEST_USER_ID);
    expect(result).toBeNull();
  });
});
