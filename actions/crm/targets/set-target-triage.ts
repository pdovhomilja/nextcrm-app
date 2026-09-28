"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import { buildTriageData, TriageValidationError } from "@/lib/crm/triage";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import type { crm_Pass_Reason } from "@prisma/client";

export type TriageDecision = "APPROVED" | "PASSED";

export const setTargetTriage = async (data: {
  id: string;
  status: TriageDecision;
  pass_reason?: crm_Pass_Reason;
  pass_note?: string | null;
  revisit_at?: Date | string | null;
}) => {
  const { id, status, pass_reason, pass_note, revisit_at } = data;
  if (!id) return { error: "id is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteTarget(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  // Validate + build the write shape (rejects any status other than
  // APPROVED/PASSED, and requires a reason on PASSED).
  let triageData;
  try {
    triageData = buildTriageData({ status, pass_reason, pass_note, revisit_at, userId: user.id });
  } catch (e) {
    if (e instanceof TriageValidationError) return { error: e.message };
    throw e;
  }

  const existing = await prismadb.crm_Targets.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) return { error: "Target not found" };

  try {
    const target = await prismadb.crm_Targets.update({
      where: { id },
      data: { ...triageData, updatedBy: user.id },
    });

    await writeAuditLog({
      entityType: "target",
      entityId: id,
      action: "updated",
      changes: diffObjects(
        existing as unknown as Record<string, unknown>,
        target as unknown as Record<string, unknown>
      ),
      userId: user.id,
    });

    revalidatePath("/[locale]/(routes)/campaigns/targets", "page");
    return { data: target };
  } catch (error) {
    return { error: "Failed to update target triage" };
  }
};
