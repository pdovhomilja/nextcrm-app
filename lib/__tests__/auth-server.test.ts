jest.mock("@/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("next/headers", () => ({ headers: jest.fn().mockResolvedValue(new Headers()) }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { users: { findUnique: jest.fn() } },
}));

import { auth } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getSession, getSessionAnyStatus } from "@/lib/auth-server";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";

const apiGetSession = auth.api.getSession as unknown as jest.Mock;
const findUnique = prismadb.users.findUnique as jest.Mock;

function sessionWith(userStatus: string) {
  return { session: { id: "s1" }, user: { id: "u1", role: "admin", userStatus } };
}

beforeEach(() => jest.clearAllMocks());

describe("getSession", () => {
  it("returns the session of an ACTIVE user", async () => {
    apiGetSession.mockResolvedValue(sessionWith("ACTIVE"));
    await expect(getSession()).resolves.toMatchObject({ user: { id: "u1" } });
  });

  it.each(["INACTIVE", "PENDING"])("returns null for a %s user", async (status) => {
    apiGetSession.mockResolvedValue(sessionWith(status));
    await expect(getSession()).resolves.toBeNull();
  });

  it("returns null without a session", async () => {
    apiGetSession.mockResolvedValue(null);
    await expect(getSession()).resolves.toBeNull();
  });
});

describe("getSessionAnyStatus", () => {
  it("still returns the session of an INACTIVE user (for the status pages)", async () => {
    apiGetSession.mockResolvedValue(sessionWith("INACTIVE"));
    await expect(getSessionAnyStatus()).resolves.toMatchObject({
      user: { userStatus: "INACTIVE" },
    });
  });
});

describe("requireAuthenticated (server actions and API routes)", () => {
  it.each(["INACTIVE", "PENDING"])("rejects a %s user even if they are admin", async (status) => {
    apiGetSession.mockResolvedValue(sessionWith(status));
    findUnique.mockResolvedValue({ id: "u1", role: "admin" });
    await expect(requireAuthenticated()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("accepts an ACTIVE user", async () => {
    apiGetSession.mockResolvedValue(sessionWith("ACTIVE"));
    findUnique.mockResolvedValue({ id: "u1", role: "admin" });
    await expect(requireAuthenticated()).resolves.toEqual({ id: "u1", role: "admin" });
  });
});
