"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
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

  // A pass must record why, so nothing is silently skipped.
  if (status === "PASSED" && !pass_reason) {
    return { error: "pass_reason is required when passing a target" };
  }

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

  const existing = await prismadb.crm_Targets.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) return { error: "Target not found" };

  // APPROVED clears any prior pass metadata; PASSED records the reason/note and
  // an optional revisit date (snooze) to resurface later.
  const triageData =
    status === "APPROVED"
      ? {
          triage_status: "APPROVED" as const,
          pass_reason: null,
          pass_note: null,
          revisit_at: null,
        }
      : {
          triage_status: "PASSED" as const,
          pass_reason: pass_reason ?? null,
          pass_note: pass_note ?? null,
          revisit_at: revisit_at ? new Date(revisit_at) : null,
        };

  try {
    const target = await prismadb.crm_Targets.update({
      where: { id },
      data: {
        ...triageData,
        triaged_at: new Date(),
        triaged_by: user.id,
        updatedBy: user.id,
      },
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
