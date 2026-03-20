import { generateApiToken, validateApiToken, revokeApiToken } from "@/lib/api-tokens";
import { prismadb } from "@/lib/prisma";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    apiToken: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prismadb as jest.Mocked<typeof prismadb>;

describe("generateApiToken", () => {
  it("returns a token starting with nxtc__", async () => {
    (mockPrisma.apiToken.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiToken.create as jest.Mock).mockResolvedValue({ id: "1" });

    const result = await generateApiToken("user-id", "My Token");
    expect(result.rawToken).toMatch(/^nxtc__[a-f0-9]{48}$/);
  });

  it("throws if user has 10 active tokens", async () => {
    (mockPrisma.apiToken.count as jest.Mock).mockResolvedValue(10);

    await expect(generateApiToken("user-id", "My Token")).rejects.toThrow(
      "Maximum 10 active tokens allowed per user"
    );
  });
});

describe("validateApiToken", () => {
  it("returns userId for valid token", async () => {
    const token = "nxtc__" + "a".repeat(48);
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "user-123",
      revokedAt: null,
      expiresAt: null,
    });

    const result = await validateApiToken(token);
    expect(result).toBe("user-123");
  });

  it("throws for revoked token", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "user-123",
      revokedAt: new Date(),
      expiresAt: null,
    });

    await expect(validateApiToken("nxtc__" + "a".repeat(48))).rejects.toThrow(
      "Invalid token"
    );
  });

  it("throws for expired token", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "user-123",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(validateApiToken("nxtc__" + "a".repeat(48))).rejects.toThrow(
      "Invalid token"
    );
  });
});

describe("revokeApiToken", () => {
  it("revokes a token owned by the user", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "user-123",
    });
    (mockPrisma.apiToken.update as jest.Mock).mockResolvedValue({});

    await expect(revokeApiToken("token-id", "user-123")).resolves.toBeUndefined();
    expect(mockPrisma.apiToken.update).toHaveBeenCalledWith({
      where: { id: "token-id" },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    });
  });

  it("throws if token belongs to a different user", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "other-user",
    });

    await expect(revokeApiToken("token-id", "user-123")).rejects.toThrow("Not found");
  });

  it("throws if token does not exist", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(revokeApiToken("token-id", "user-123")).rejects.toThrow("Not found");
  });
});
