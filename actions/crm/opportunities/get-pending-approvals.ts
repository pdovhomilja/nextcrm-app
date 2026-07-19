"use server";

import { prismadb } from "@/lib/prisma";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export type PendingApproval = {
  id: string;
  name: string | null;
  accountName: string | null;
  repName: string | null;
  budget: number;
  expected_revenue: number;
  approval_requested_at: Date | null;
};

export async function getPendingApprovals(): Promise<
  PendingApproval[] | { error: string }
> {
  try {
    await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError || e instanceof AuthorizationError) {
      return { error: "Forbidden" };
    }
    throw e;
  }

  const rows = await prismadb.crm_Opportunities.findMany({
    where: { approval_status: "PENDING", deletedAt: null },
    include: {
      assigned_account: { select: { name: true } },
      assigned_to_user: { select: { name: true } },
    },
    orderBy: { approval_requested_at: "asc" },
  });

  return serializeDecimalsList(rows).map((r: any) => ({
    id: r.id,
    name: r.name ?? null,
    accountName: r.assigned_account?.name ?? null,
    repName: r.assigned_to_user?.name ?? null,
    budget: r.budget ?? 0,
    expected_revenue: r.expected_revenue ?? 0,
    approval_requested_at: r.approval_requested_at ?? null,
  }));
}
