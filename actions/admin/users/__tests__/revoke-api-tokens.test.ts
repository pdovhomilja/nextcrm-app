jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    apiToken: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revokeUserApiTokens } from "../revoke-api-tokens";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.Mock;
const updateMany = prismadb.apiToken.updateMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("revokeUserApiTokens", () => {
  it("Unauthorized when no (active) session", async () => {
    gs.mockResolvedValue(null as any);
    await expect(revokeUserApiTokens("target")).resolves.toEqual({ error: "Unauthorized" });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it.each(["user", "manager"])("Forbidden for role %s", async (role) => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role });
    await expect(revokeUserApiTokens("target")).resolves.toEqual({ error: "Forbidden" });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("admin revokes every active token of another user", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" });
    await expect(revokeUserApiTokens("target")).resolves.toEqual({ data: { revoked: 3 } });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "target", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("requires a userId", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" });
    await expect(revokeUserApiTokens("")).resolves.toEqual({ error: "userId is required" });
    expect(updateMany).not.toHaveBeenCalled();
  });
});
