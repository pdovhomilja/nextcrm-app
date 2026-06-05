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
    addWatcher: vi.fn((id) => ({ create: { user_id: id } })),
  },
}));

import { watchAccount } from "@/actions/crm/accounts/watch-account";
import { getSession } from "@/lib/auth-server";
import { junctionTableHelpers } from "@/lib/junction-helpers";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("watchAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await watchAccount("a1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("missing accountId returns error", async () => {
    const res = await watchAccount("");
    expect(res).toEqual({ error: "accountId is required" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("adds watcher using junctionTableHelpers", async () => {
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    const res = await watchAccount("a1");
    expect(res).toEqual({ success: true });
    expect(junctionTableHelpers.addWatcher).toHaveBeenCalledWith("u1");
    expect(prismadb.crm_Accounts.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: {
        watchers: { create: { user_id: "u1" } },
      },
    });
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await watchAccount("a1");
    expect(res).toEqual({ error: "Failed to watch account" });
  });
});
