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
 * HOMEPAGE_STYLE prompts the operator may choose from for a single generation.
 *
 * Unlike the Industry pair, the style pick is ONE-SHOT and never persisted — it
 * rides along in the generate request and the server falls back to the
 * deterministic auto pick when none is sent (see resolveStyleDirection). So this
 * returns only the option list; there is no saved selection or default to read.
 * `targetId` is still taken so the read is authorized against the target the
 * drawer is generating for.
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

  const rows = await prismadb.crm_Ai_Prompt.findMany({
    where: { kind: "HOMEPAGE_STYLE", scope: "ORG", deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { data: { options: rows.map((r) => ({ id: r.id, name: r.name })) } };
};
