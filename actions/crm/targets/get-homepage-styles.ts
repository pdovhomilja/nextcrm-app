"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

/**
 * Data for the drawer's Style (art-direction) dropdown: the active ORG
 * HOMEPAGE_STYLE prompts the operator may choose from, plus the target's
 * REMEMBERED style so the drawer can default to it.
 *
 * The chosen style is persisted per target (`homepage_style_prompt_id`,
 * snapshotted on first generate — see resolveStyleDirection) and reused across
 * generate/refine, so it does not change on its own. `selectedId` is the saved
 * style when it is still an active option, else null (fall back to Auto).
 * `targetId` is also what the read is authorized against.
 */
export const getHomepageStyles = async (data: { targetId: string }) => {
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
      where: { kind: "HOMEPAGE_STYLE", scope: "ORG", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prismadb.crm_Targets.findUnique({
      where: { id: targetId },
      select: { homepage_style_prompt_id: true },
    }),
  ]);

  // Only surface the saved style if it is still an active option; otherwise the
  // drawer falls back to Auto rather than showing a stale/removed style.
  const savedId = target?.homepage_style_prompt_id ?? null;
  const selectedId = savedId && rows.some((r) => r.id === savedId) ? savedId : null;

  return {
    data: { options: rows.map((r) => ({ id: r.id, name: r.name })), selectedId },
  };
};
