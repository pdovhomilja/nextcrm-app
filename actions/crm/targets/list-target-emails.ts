"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export type TargetEmailRow = {
  id: string;
  subject: string;
  status: string;
  sent_at: Date | null;
  opened_at: Date | null;
  clicked_at: Date | null;
  error_message: string | null;
  included_homepage: boolean;
  created_on: Date | null;
};

/**
 * The outreach-email history for a single target (newest first), for the target
 * detail view. Scoped to a caller who can read the target; returns [] on auth
 * failure so the section renders empty rather than throwing.
 */
export const listTargetEmails = async (
  targetId: string
): Promise<TargetEmailRow[]> => {
  let user;
  try {
    user = await requireAuthenticated();
    await assertCanReadTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthenticationError || e instanceof AuthorizationError) return [];
    throw e;
  }

  return prismadb.crm_Target_Email.findMany({
    where: { targetId, deletedAt: null },
    orderBy: { created_on: "desc" },
    select: {
      id: true,
      subject: true,
      status: true,
      sent_at: true,
      opened_at: true,
      clicked_at: true,
      error_message: true,
      included_homepage: true,
      created_on: true,
    },
  });
};
