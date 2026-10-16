"use server";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getLeadsCount } from "@/actions/dashboard/get-leads-count";
import { getOpportunitiesCount } from "@/actions/dashboard/get-opportunities-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getBoardsCount } from "@/actions/dashboard/get-boards-count";
import { hasRofytAdminSession } from "@/lib/ventures/rofyt-session";
import { getVentureBySlug } from "@/actions/ventures/list-ventures";
import { ROFYT_SLUG } from "@/lib/ventures/catalog";

async function requireVenturesAccess() {
  try {
    return await requireRole(["admin", "manager"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export type RofytStats = {
  accounts: number;
  leads: number;
  opportunities: number;
  activeUsers: number;
  projects: number;
  ventures: number;
};

export async function getRofytStatsIfAuthorized(): Promise<{
  unlocked: boolean;
  stats: RofytStats | null;
}> {
  await requireVenturesAccess();
  const venture = await getVentureBySlug(ROFYT_SLUG);
  if (!venture) return { unlocked: false, stats: null };

  const unlocked = await hasRofytAdminSession(venture.id);
  if (!unlocked) return { unlocked: false, stats: null };

  const [accounts, leads, opportunities, activeUsers, projects] = await Promise.all([
    getAccountsCount(),
    getLeadsCount(),
    getOpportunitiesCount(),
    getActiveUsersCount(),
    getBoardsCount(),
  ]);

  return {
    unlocked: true,
    stats: {
      accounts,
      leads,
      opportunities,
      activeUsers,
      projects,
      ventures: 1,
    },
  };
}
