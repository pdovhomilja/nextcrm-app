"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  targetReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getTargets = async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  const targets = await prismadb.crm_Targets.findMany({
    where: { ...targetReadScopeWhere(user) },
    orderBy: { created_on: "desc" },
    include: {
      crate_by_user: { select: { name: true } },
      target_lists: { include: { target_list: { select: { id: true, name: true, status: true } } } },
      // Minimal engagement fields for the list's Engagement column/filter — the
      // furthest state across a target's outreach is derived client-side
      // (targetEngagementStatus). Outreach is ~1 email/target, so this is a light join.
      target_emails: {
        where: { deletedAt: null },
        select: { status: true, opened_at: true, homepage_clicked_at: true },
      },
      // One-to-one generated homepage — powers the list's "Homepage" column +
      // filter. current_version_id (not transient job status) marks a published
      // page, matching the /p/ serving gate and the email drawer's hasHomepage.
      homepage: {
        select: {
          slug: true,
          status: true,
          preview_url: true,
          current_version_id: true,
          deletedAt: true,
        },
      },
    },
  });
  return targets;
};
