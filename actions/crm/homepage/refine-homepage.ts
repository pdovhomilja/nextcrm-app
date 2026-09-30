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
import { MAX_HOMEPAGE_PROMPT_CHARS, isHomepageRunActive } from "@/lib/homepage/queue-generation";

export const refineHomepage = async (data: { homepageId: string; prompt: string }) => {
  const { homepageId } = data;
  if (!homepageId) return { error: "homepageId is required" };
  if (typeof data.prompt !== "string" || !data.prompt.trim()) {
    return { error: "A change request is required." };
  }
  const prompt = data.prompt.trim();
  if (prompt.length > MAX_HOMEPAGE_PROMPT_CHARS) {
    return { error: `Change request is too long (max ${MAX_HOMEPAGE_PROMPT_CHARS} characters).` };
  }

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const homepage = await prismadb.crm_Target_Homepage.findFirst({
    where: { id: homepageId, deletedAt: null },
    select: { id: true, targetId: true, status: true, current_version_id: true, updatedAt: true },
  });
  if (!homepage) return { error: "Homepage not found" };

  try {
    await assertCanWriteTarget(user, homepage.targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  // A refine needs a published version to build on, and must not stack on a run
  // that's already in flight (each refine is a full vision pass).
  if (!homepage.current_version_id) {
    return { error: "Generate the homepage first, then refine it." };
  }
  if (isHomepageRunActive(homepage.status, homepage.updatedAt)) {
    return { error: "A generation is already in progress. Wait for it to finish." };
  }

  const target = await prismadb.crm_Targets.findFirst({
    where: { id: homepage.targetId, deletedAt: null },
    select: { triage_status: true },
  });
  if (!target) return { error: "Target not found" };
  if (target.triage_status !== "APPROVED") {
    return { error: "Target must be approved before generating a homepage" };
  }

  // targetId is required: it is the per-target concurrency key on the job.
  await inngest.send({
    name: "homepage/target.refine",
    data: { homepageId, targetId: homepage.targetId, prompt, triggeredBy: user.id },
  });
  await writeAuditLog({
    entityType: "target",
    entityId: homepage.targetId,
    action: "updated",
    changes: [{ field: "homepage", old: null, new: "refinement queued" }],
    userId: user.id,
  });
  return { data: { queued: true } };
};
