jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Opportunities_Sales_Stages: { findUnique: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import { qualifiedEntryBlockReason } from "@/lib/crm/approval-gate";

const stage = prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock;

describe("qualifiedEntryBlockReason", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks entering a qualified stage without approval", async () => {
    stage.mockResolvedValue({ stage_kind: "qualified" });
    const reason = await qualifiedEntryBlockReason({
      fromStage: "s-presale", toStage: "s-qualified", approvalStatus: "NONE",
    });
    expect(reason).toContain("approval");
  });

  it("allows entering a qualified stage when APPROVED", async () => {
    stage.mockResolvedValue({ stage_kind: "qualified" });
    expect(
      await qualifiedEntryBlockReason({
        fromStage: "s-presale", toStage: "s-qualified", approvalStatus: "APPROVED",
      }),
    ).toBeNull();
  });

  it("ignores non-qualified target stages", async () => {
    stage.mockResolvedValue({ stage_kind: "care" });
    expect(
      await qualifiedEntryBlockReason({
        fromStage: "a", toStage: "b", approvalStatus: "NONE",
      }),
    ).toBeNull();
  });

  it("no-ops when the stage is unchanged (already inside)", async () => {
    expect(
      await qualifiedEntryBlockReason({
        fromStage: "s-qualified", toStage: "s-qualified", approvalStatus: "NONE",
      }),
    ).toBeNull();
    expect(stage).not.toHaveBeenCalled();
  });

  it("no-ops when toStage is null", async () => {
    expect(
      await qualifiedEntryBlockReason({
        fromStage: "a", toStage: null, approvalStatus: "NONE",
      }),
    ).toBeNull();
  });
});
