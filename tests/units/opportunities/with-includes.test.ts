import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
  ...vi.importActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Opportunities: { findMany: vi.fn() },
  },
}));

import { getOpportunitiesFull } from "@/actions/crm/get-opportunities-with-includes";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getOpportunitiesFull scope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getOpportunitiesFull();
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("user role: where includes deletedAt:null and OR scope", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getOpportunitiesFull();
    const call = (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(Array.isArray(call.where.OR)).toBe(true);
    expect(call.where.OR).toEqual(expect.arrayContaining([{ assigned_to: "u1" }, { createdBy: "u1" }]));
  });

  it("user role: returns rows", async () => {
    mockUser("user", "u1");
    const rows = [{ id: "o1" }];
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(rows);
    const res = await getOpportunitiesFull();
    expect(res).toEqual(rows);
  });

  it("manager: where = { deletedAt: null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getOpportunitiesFull();
    const call = (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});
