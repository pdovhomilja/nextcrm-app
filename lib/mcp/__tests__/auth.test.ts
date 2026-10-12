const mockHeaders = new Headers();
jest.mock("next/headers", () => ({ headers: jest.fn(async () => mockHeaders) }));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/api-tokens", () => ({ validateApiToken: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { users: { findUnique: jest.fn() } },
}));

import { validateApiToken } from "@/lib/api-tokens";
import { prismadb } from "@/lib/prisma";
import { getMcpUser } from "@/lib/mcp/auth";

const validate = validateApiToken as jest.Mock;
const findUnique = prismadb.users.findUnique as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockHeaders.set("authorization", "Bearer nxtc__" + "a".repeat(48));
  validate.mockResolvedValue("u1");
});

describe("getMcpUser (bearer token auth)", () => {
  it("returns the token's ACTIVE user", async () => {
    findUnique.mockResolvedValue({ id: "u1", role: "manager", userStatus: "ACTIVE" });
    await expect(getMcpUser()).resolves.toEqual({ id: "u1", role: "manager" });
  });

  it.each(["INACTIVE", "PENDING"])("rejects a valid token of a %s user", async (status) => {
    findUnique.mockResolvedValue({ id: "u1", role: "admin", userStatus: status });
    await expect(getMcpUser()).rejects.toThrow("Unauthorized");
  });
});
