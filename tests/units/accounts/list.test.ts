import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Accounts: { findMany: vi.fn() },
  },
}));

import { getAccounts } from "@/actions/crm/get-accounts";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getAccounts (rich-shape, page-level)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("user role: where merges deletedAt:null + creator/assigned/watcher OR", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where).toEqual({
      deletedAt: null,
      OR: [{ assigned_to: "u1" }, { createdBy: "u1" }, { watchers: { some: { user_id: "u1" } } }],
    });
  });

  it("manager role: where = { deletedAt: null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
  });

  it("admin role: where = { deletedAt: null } (no OR)", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
  });

  it("preserves the rich include shape used by AccountsView (assigned_to_user, contacts, watchers)", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.include).toMatchObject({
      assigned_to_user: { select: { name: true } },
      contacts: { select: { first_name: true, last_name: true } },
      watchers: expect.objectContaining({
        include: expect.objectContaining({
          user: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              name: true,
              email: true,
              avatar: true,
            }),
          }),
        }),
      }),
    });
  });
});
