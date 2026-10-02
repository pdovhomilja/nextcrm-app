"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

/**
 * Data for the drawer's Industry dropdown: the active ORG HOMEPAGE_INDUSTRY
 * prompts (the same set setHomepageIndustry accepts), the target's saved
 * selection (null when unset or no longer an active option), and the Generic
 * default id the UI shows when nothing is saved.
 */
export const getHomepageIndustry = async (data: { targetId: string }) => {
  const { targetId } = data;
  if (!targetId) return { error: "targetId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanReadTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const [rows, target] = await Promise.all([
    prismadb.crm_Ai_Prompt.findMany({
      where: { kind: "HOMEPAGE_INDUSTRY", scope: "ORG", deletedAt: null },
      select: { id: true, name: true, is_default: true },
      orderBy: { name: "asc" },
    }),
    prismadb.crm_Targets.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { homepage_industry_prompt_id: true },
    }),
  ]);

  const saved = target?.homepage_industry_prompt_id ?? null;
  return {
    data: {
      options: rows.map((r) => ({ id: r.id, name: r.name })),
      selectedId: saved && rows.some((r) => r.id === saved) ? saved : null,
      defaultId: rows.find((r) => r.is_default)?.id ?? null,
    },
  };
};
