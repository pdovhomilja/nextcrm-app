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
      versions: {
        orderBy: { created_at: "asc" },
        select: { id: true, pass_kind: true, agent_critique: true, created_at: true },
      },
    },
  });
  if (!homepage) return { data: null };

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
      versions: homepage.versions.map((v) => ({
        id: v.id,
        pass_kind: v.pass_kind,
        agent_critique: v.agent_critique,
        created_at: v.created_at,
      })),
    },
  };
};
