import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: {
      findMany: vi.fn(),
    },
  },
}));

import { getUserLeads } from "@/actions/crm/get-user-leads";
import { prismadb } from "@/lib/prisma";

describe("getUserLeads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns leads assigned to user", async () => {
    const leads = [
      { id: "l1", lastName: "Doe", assigned_to: "u1" },
      { id: "l2", lastName: "Smith", assigned_to: "u1" },
    ];
    (prismadb.crm_Leads.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(leads);
    const res = await getUserLeads("u1");
    expect(res).toEqual(leads);
    expect(prismadb.crm_Leads.findMany).toHaveBeenCalledWith({
      where: { assigned_to: "u1", deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns empty array when no leads", async () => {
    (prismadb.crm_Leads.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await getUserLeads("u1");
    expect(res).toEqual([]);
  });
});
