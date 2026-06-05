import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { update: vi.fn() },
  },
}));

vi.mock("@/lib/junction-helpers", () => ({
  junctionTableHelpers: {
    removeAccountWatcher: vi.fn((accountId, userId) => ({
      delete: {
        account_id_user_id: {
          account_id: accountId,
          user_id: userId,
        },
      },
    })),
  },
}));

import { unwatchAccount } from "@/actions/crm/accounts/unwatch-account";
import { getSession } from "@/lib/auth-server";
import { junctionTableHelpers } from "@/lib/junction-helpers";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("unwatchAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await unwatchAccount("a1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("missing accountId returns error", async () => {
    const res = await unwatchAccount("");
    expect(res).toEqual({ error: "accountId is required" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("removes watcher using junctionTableHelpers", async () => {
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    const res = await unwatchAccount("a1");
    expect(res).toEqual({ success: true });
    expect(junctionTableHelpers.removeAccountWatcher).toHaveBeenCalledWith("a1", "u1");
    expect(prismadb.crm_Accounts.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: {
        watchers: {
          delete: {
            account_id_user_id: {
              account_id: "a1",
              user_id: "u1",
            },
          },
        },
      },
    });
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await unwatchAccount("a1");
    expect(res).toEqual({ error: "Failed to unwatch account" });
  });
});
