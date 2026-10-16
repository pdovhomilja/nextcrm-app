"use server";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getLeadsCount } from "@/actions/dashboard/get-leads-count";
import { getOpportunitiesCount } from "@/actions/dashboard/get-opportunities-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getBoardsCount } from "@/actions/dashboard/get-boards-count";
import { hasVenturesMasterSession } from "@/lib/ventures/ventures-master-session";

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
  const unlocked = await hasVenturesMasterSession();
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
