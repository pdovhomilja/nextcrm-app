jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: { findMany: jest.fn() },
    crm_campaign_steps: { groupBy: jest.fn() },
    crm_Targets: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { findRecycleCandidates } from "@/lib/crm/recycle";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-07-18T00:00:00Z");
const old = new Date(now.getTime() - 100 * DAY); // > 90 days ago
const recent = new Date(now.getTime() - 10 * DAY);

describe("findRecycleCandidates", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns targets whose final step was sent 90+ days ago", async () => {
    (prismadb.crm_campaign_steps.groupBy as jest.Mock).mockResolvedValue([
      { campaign_id: "camp1", _max: { order: 3 } },
    ]);
    (prismadb.crm_campaign_sends.findMany as jest.Mock).mockResolvedValue([
      // t-done finished the sequence long ago; t-fresh finished recently;
      // t-mid never got the last step
      { target_id: "t-done", campaign_id: "camp1", sent_at: old, step: { order: 3 } },
      { target_id: "t-fresh", campaign_id: "camp1", sent_at: recent, step: { order: 3 } },
      { target_id: "t-mid", campaign_id: "camp1", sent_at: old, step: { order: 1 } },
    ]);
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([
      { id: "t-done" }, // survives the eligibility filter
    ]);

    const ids = await findRecycleCandidates(now);
    expect(ids).toEqual(["t-done"]);

    // Eligibility filter excludes converted/suppressed/already-recycled targets
    const where = (prismadb.crm_Targets.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.id.in).toEqual(["t-done"]);
    expect(where.do_not_email).toBe(false);
    expect(where.converted_at).toBeNull();
    expect(where.deletedAt).toBeNull();
    expect(where.target_lists.none.target_list.name).toBe("Recycled");
  });

  it("returns [] when no sequence has finished", async () => {
    (prismadb.crm_campaign_steps.groupBy as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_campaign_sends.findMany as jest.Mock).mockResolvedValue([]);
    const ids = await findRecycleCandidates(now);
    expect(ids).toEqual([]);
    expect(prismadb.crm_Targets.findMany).not.toHaveBeenCalled();
  });
});
