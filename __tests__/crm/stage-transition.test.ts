jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Opportunities: { update: jest.fn() } },
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { handleStageTransition } from "@/lib/crm/stage-transition";

describe("handleStageTransition", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no-ops when the stage did not change", async () => {
    const acted = await handleStageTransition({
      opportunityId: "o1", fromStage: "s1", toStage: "s1",
    });
    expect(acted).toBe(false);
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("no-ops when toStage is null", async () => {
    const acted = await handleStageTransition({
      opportunityId: "o1", fromStage: "s1", toStage: null,
    });
    expect(acted).toBe(false);
  });

  it("stamps stage_entered_at and emits the event on a real transition", async () => {
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({});
    const acted = await handleStageTransition({
      opportunityId: "o1", fromStage: "s1", toStage: "s2",
    });
    expect(acted).toBe(true);
    expect(prismadb.crm_Opportunities.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { stage_entered_at: expect.any(Date) },
    });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/opportunity.stage-changed",
      data: { record_id: "o1", to_stage: "s2" },
    });
  });

  it("treats null -> stage as a transition (first stage assignment)", async () => {
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({});
    const acted = await handleStageTransition({
      opportunityId: "o1", fromStage: null, toStage: "s2",
    });
    expect(acted).toBe(true);
  });
});
