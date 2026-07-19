import { prismadb } from "@/lib/prisma";

// Spec §3.5 hard gate (2026-07-19 decision): a deal may only ENTER a stage
// whose stage_kind is "qualified" (quote sent) when its SOW/quote is
// APPROVED. Transitions elsewhere, staying in place, and clearing the
// stage are unaffected.
export async function qualifiedEntryBlockReason(opts: {
  fromStage: string | null;
  toStage: string | null;
  approvalStatus: string;
}): Promise<string | null> {
  const { fromStage, toStage, approvalStatus } = opts;
  if (!toStage || toStage === fromStage) return null;
  if (approvalStatus === "APPROVED") return null;

  const target = await prismadb.crm_Opportunities_Sales_Stages.findUnique({
    where: { id: toStage },
    select: { stage_kind: true },
  });
  if (target?.stage_kind !== "qualified") return null;

  return "Quote approval is required before moving this deal to the Qualified stage. Request approval from the deal page first.";
}
