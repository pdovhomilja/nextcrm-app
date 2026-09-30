"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getHomepageStatus = async (data: { targetId: string }) => {
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
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const homepage = await prismadb.crm_Target_Homepage.findFirst({
    where: { targetId, deletedAt: null },
    select: {
      id: true,
      status: true,
      error: true,
      slug: true,
      preview_url: true,
      screenshot_url: true,
      current_version_id: true,
      // Bounded + trimmed: this action is POLLED every ~2.5s while a job runs, so
      // the version list must not grow without limit or re-ship full critiques each
      // tick. Newest 60 (reversed to ascending for the drawer), critique clamped to
      // ~2 lines' worth — which is all the UI renders (line-clamp-2).
      versions: {
        orderBy: { created_at: "desc" },
        take: 60,
        select: { id: true, pass_kind: true, agent_critique: true, created_at: true },
      },
    },
  });
  if (!homepage) return { data: null };

  const CRITIQUE_MAX = 280;
  return {
    data: {
      // id + error feed the generate drawer: refine/revert/slug actions key on the
      // homepage id (the generate route doesn't return it), and the FAILED reason
      // must be shown to the operator.
      id: homepage.id,
      status: homepage.status,
      error: homepage.error,
      slug: homepage.slug,
      preview_url: homepage.preview_url,
      screenshot_url: homepage.screenshot_url,
      current_version_id: homepage.current_version_id,
      versions: homepage.versions
        .slice()
        .reverse()
        .map((v) => ({
          id: v.id,
          pass_kind: v.pass_kind,
          agent_critique:
            v.agent_critique && v.agent_critique.length > CRITIQUE_MAX
              ? `${v.agent_critique.slice(0, CRITIQUE_MAX)}…`
              : v.agent_critique,
          created_at: v.created_at,
        })),
    },
  };
};
