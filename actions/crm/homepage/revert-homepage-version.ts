"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

/**
 * Queue a revert. Re-rendering needs chromium, so it runs in the Inngest job
 * (`homepage/target.revert`), never in this action.
 */
export const revertHomepageVersion = async (data: { homepageId: string; versionId: string }) => {
  const { homepageId, versionId } = data;
  if (!homepageId || !versionId) return { error: "homepageId and versionId are required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const homepage = await prismadb.crm_Target_Homepage.findFirst({
    where: { id: homepageId, deletedAt: null },
    select: { id: true, targetId: true },
  });
  if (!homepage) return { error: "Homepage not found" };

  try {
    await assertCanWriteTarget(user, homepage.targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const target = await prismadb.crm_Targets.findFirst({
    where: { id: homepage.targetId, deletedAt: null },
    select: { triage_status: true },
  });
  if (!target) return { error: "Target not found" };
  if (target.triage_status !== "APPROVED") {
    return { error: "Target must be approved before generating a homepage" };
  }

  // The version must belong to THIS homepage (no cross-homepage reverts).
  const version = await prismadb.crm_Target_Homepage_Version.findFirst({
    where: { id: versionId, homepage_id: homepageId },
    select: { id: true },
  });
  if (!version) return { error: "Version not found" };

  await inngest.send({
    name: "homepage/target.revert",
    data: { homepageId, targetId: homepage.targetId, versionId, triggeredBy: user.id },
  });

  await writeAuditLog({
    entityType: "target",
    entityId: homepage.targetId,
    action: "updated",
    changes: [{ field: "homepage_version", old: null, new: `revert queued to ${versionId}` }],
    userId: user.id,
  });
  return { data: { queued: true } };
};
