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

// id columns are @db.Uuid: a non-UUID string would make Prisma throw, not miss.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sets (or clears, with null) the HOMEPAGE_INDUSTRY prompt a target's homepage
 * generation uses (crm_Targets.homepage_industry_prompt_id). Same write scope as
 * every other target write (owner, or admin/manager). The id must be a live ORG
 * HOMEPAGE_INDUSTRY prompt, the only rows loadIndustryBody() will honor.
 */
export const setHomepageIndustry = async (data: {
  targetId: string;
  promptId: string | null;
}) => {
  const { targetId, promptId } = data;
  if (!targetId) return { error: "targetId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  if (promptId !== null) {
    if (typeof promptId !== "string" || !UUID_RE.test(promptId)) {
      return { error: "Unknown industry prompt" };
    }
    const prompt = await prismadb.crm_Ai_Prompt.findFirst({
      where: { id: promptId, kind: "HOMEPAGE_INDUSTRY", scope: "ORG", deletedAt: null },
      select: { id: true },
    });
    if (!prompt) return { error: "Unknown industry prompt" };
  }

  const existing = await prismadb.crm_Targets.findFirst({
    where: { id: targetId, deletedAt: null },
  });
  if (!existing) return { error: "Target not found" };

  try {
    const target = await prismadb.crm_Targets.update({
      where: { id: targetId },
      data: { homepage_industry_prompt_id: promptId, updatedBy: user.id },
    });
    await writeAuditLog({
      entityType: "target",
      entityId: targetId,
      action: "updated",
      changes: diffObjects(
        existing as unknown as Record<string, unknown>,
        target as unknown as Record<string, unknown>,
      ),
      userId: user.id,
    });
    revalidatePath("/[locale]/(routes)/campaigns/targets", "page");
    return { data: { promptId: target.homepage_industry_prompt_id ?? null } };
  } catch {
    return { error: "Failed to update industry" };
  }
};
