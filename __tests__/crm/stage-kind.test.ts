jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Opportunities_Sales_Stages: { findUnique: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import { qualifiedEntryBlockReason } from "@/lib/crm/approval-gate";
import { isQualifiedStage, stagesOpenForCreate } from "@/lib/crm/stage-kind";

const STAGES = [
  { id: "s-presale", name: "Pre-sale", stage_kind: "pre_sale" },
  { id: "s-qualified", name: "Quote sent", stage_kind: "qualified" },
  { id: "s-po", name: "Purchase order", stage_kind: "purchase_order" },
  { id: "s-plain", name: "Plain", stage_kind: null },
  { id: "s-legacy", name: "Legacy" },
];

describe("stagesOpenForCreate", () => {
  it("drops qualified stages and keeps the rest in order", () => {
    expect(stagesOpenForCreate(STAGES).map((s) => s.id)).toEqual([
      "s-presale", "s-po", "s-plain", "s-legacy",
    ]);
  });

  it("isQualifiedStage is false for a missing stage", () => {
    expect(isQualifiedStage(null)).toBe(false);
    expect(isQualifiedStage(undefined)).toBe(false);
  });

  // The create UI offers exactly the stages the server gate accepts for a new deal
  // (no previous stage, no approved quote).
  it.each(STAGES)("offers $id on create iff the approval gate lets a new deal start there", async (stage) => {
    (prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock).mockResolvedValue({
      stage_kind: stage.stage_kind ?? null,
    });
    const blocked = await qualifiedEntryBlockReason({ fromStage: null, toStage: stage.id, approvalStatus: "NONE" });
    const offered = stagesOpenForCreate([stage]).length === 1;
    expect(offered).toBe(blocked === null);
  });
});
