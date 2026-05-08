import { AuthenticationError, AuthorizationError } from "../errors";

jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { users: { findUnique: jest.fn() } },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  requireRole,
  isAdmin,
  isManagerOrAdmin,
} from "../session";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUnique = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireAuthenticated", () => {
  it("throws AuthenticationError when no session", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    await expect(requireAuthenticated()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("throws AuthenticationError when DB user missing", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue(null as any);
    await expect(requireAuthenticated()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("returns AuthzUser from DB role", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "manager" } as any);
    await expect(requireAuthenticated()).resolves.toEqual({ id: "u1", role: "manager" });
  });

  it("falls back to user when DB role is unrecognized", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "garbage" } as any);
    await expect(requireAuthenticated()).resolves.toEqual({ id: "u1", role: "user" });
  });
});

describe("requireRole", () => {
  it("throws AuthorizationError when role not allowed", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "user" } as any);
    await expect(requireRole(["admin"])).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("returns the user when role is allowed", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "admin" } as any);
    await expect(requireRole(["admin"])).resolves.toEqual({ id: "u1", role: "admin" });
  });

  it("admin satisfies any allowed list (when explicitly listed)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "admin" } as any);
    await expect(requireRole(["manager", "admin"])).resolves.toEqual({ id: "u1", role: "admin" });
  });
});

describe("role predicates", () => {
  it("isAdmin only true for admin", () => {
    expect(isAdmin({ id: "1", role: "admin" })).toBe(true);
    expect(isAdmin({ id: "1", role: "manager" })).toBe(false);
    expect(isAdmin({ id: "1", role: "user" })).toBe(false);
  });

  it("isManagerOrAdmin true for manager and admin", () => {
    expect(isManagerOrAdmin({ id: "1", role: "manager" })).toBe(true);
    expect(isManagerOrAdmin({ id: "1", role: "admin" })).toBe(true);
    expect(isManagerOrAdmin({ id: "1", role: "user" })).toBe(false);
  });
});
