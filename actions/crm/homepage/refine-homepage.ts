"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const refineHomepage = async (data: { homepageId: string; prompt: string }) => {
  const { homepageId } = data;
  const prompt = data.prompt?.trim();
  if (!homepageId) return { error: "homepageId is required" };
  if (!prompt) return { error: "prompt is required" };

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

  // targetId is required: it is the per-target concurrency key on the job.
  await inngest.send({
    name: "homepage/target.refine",
    data: { homepageId, targetId: homepage.targetId, prompt, triggeredBy: user.id },
  });
  return { data: { queued: true } };
};
