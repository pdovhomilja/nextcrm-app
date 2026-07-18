jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_campaign_sends: { findFirst: jest.fn() },
    crm_Opportunities_Sales_Stages: { findFirst: jest.fn() },
    crm_Opportunities: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/actions/crm/targets/convert-target", () => ({
  convertTarget: jest.fn(),
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { getSession } from "@/lib/auth-server";
import { convertTarget } from "@/actions/crm/targets/convert-target";
import { convertTargetToDeal } from "@/actions/crm/targets/convert-target-to-deal";

describe("convertTargetToDeal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    expect(await convertTargetToDeal("t1")).toEqual({ error: "Unauthorized" });
    expect(convertTarget).not.toHaveBeenCalled();
  });

  it("propagates conversion errors without creating an opportunity", async () => {
    (convertTarget as jest.Mock).mockResolvedValue({ error: "Target not found" });
    expect(await convertTargetToDeal("t1")).toEqual({ error: "Target not found" });
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("creates an opportunity at the entry stage with campaign attribution", async () => {
    (convertTarget as jest.Mock).mockResolvedValue({ accountId: "a1", contactId: "c1" });
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      id: "t1",
      company: "Acme",
      last_name: "Doe",
    });
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
      campaign_id: "camp-1",
    });
    (prismadb.crm_Opportunities_Sales_Stages.findFirst as jest.Mock).mockResolvedValue({
      id: "stage-presale",
    });
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Opportunities.create as jest.Mock).mockResolvedValue({
      id: "opp-1",
      sales_stage: "stage-presale",
    });

    const res = await convertTargetToDeal("t1");

    expect(res).toEqual({ accountId: "a1", contactId: "c1", opportunityId: "opp-1" });
    const data = (prismadb.crm_Opportunities.create as jest.Mock).mock.calls[0][0].data;
    expect(data.account).toBe("a1");
    expect(data.contact).toBe("c1");
    expect(data.campaign).toBe("camp-1");
    expect(data.sales_stage).toBe("stage-presale");
    expect(data.assigned_to).toBe("u1");
    expect(data.status).toBe("ACTIVE");
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/opportunity.stage-changed",
      data: { record_id: "opp-1", to_stage: "stage-presale" },
    });
  });

  it("works without any campaign send or configured stage", async () => {
    (convertTarget as jest.Mock).mockResolvedValue({ accountId: "a1", contactId: "c1" });
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      id: "t1",
      company: null,
      last_name: "Doe",
    });
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Opportunities_Sales_Stages.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Opportunities.create as jest.Mock).mockResolvedValue({ id: "opp-2" });

    const res = await convertTargetToDeal("t1");

    expect(res).toEqual({ accountId: "a1", contactId: "c1", opportunityId: "opp-2" });
    const data = (prismadb.crm_Opportunities.create as jest.Mock).mock.calls[0][0].data;
    expect(data.campaign).toBeUndefined();
    expect(data.sales_stage).toBeUndefined();
  });

  it("returns the existing opportunity instead of creating a duplicate", async () => {
    (convertTarget as jest.Mock).mockResolvedValue({ accountId: "a1", contactId: "c1" });
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      id: "t1",
      company: "Acme",
      last_name: "Doe",
    });
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({ id: "opp-existing" });

    const res = await convertTargetToDeal("t1");

    expect(res).toEqual({ accountId: "a1", contactId: "c1", opportunityId: "opp-existing" });
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("returns a generic error instead of throwing when a lookup rejects", async () => {
    (convertTarget as jest.Mock).mockResolvedValue({ accountId: "a1", contactId: "c1" });
    (prismadb.crm_Targets.findFirst as jest.Mock).mockRejectedValue(new Error("db down"));

    await expect(convertTargetToDeal("t1")).resolves.toEqual({
      error: "Failed to create opportunity from target",
    });
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });
});
