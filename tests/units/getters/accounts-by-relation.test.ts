import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      findMany: vi.fn(),
    },
  },
}));

import { getAccountsByContactId } from "@/actions/crm/get-accounts-by-contactId";
import { getAccountsByOpportunityId } from "@/actions/crm/get-accounts-by-opportunityId";
import { prismadb } from "@/lib/prisma";

describe("getAccountsByContactId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns accounts linked to contact", async () => {
    const accounts = [{ id: "a1", name: "Acme", assigned_to_user: { name: "User" } }];
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(accounts);
    const res = await getAccountsByContactId("c1");
    expect(res).toEqual(accounts);
    expect(prismadb.crm_Accounts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          contacts: { some: { id: "c1" } },
        }),
      }),
    );
  });

  it("returns empty array when no accounts", async () => {
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await getAccountsByContactId("c1");
    expect(res).toEqual([]);
  });
});

describe("getAccountsByOpportunityId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns accounts linked to opportunity", async () => {
    const accounts = [{ id: "a1", name: "Acme", assigned_to_user: { name: "User" } }];
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(accounts);
    const res = await getAccountsByOpportunityId("o1");
    expect(res).toEqual(accounts);
    expect(prismadb.crm_Accounts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          opportunities: { some: { id: "o1" } },
        }),
      }),
    );
  });

  it("returns empty array when no accounts", async () => {
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await getAccountsByOpportunityId("o1");
    expect(res).toEqual([]);
  });
});
