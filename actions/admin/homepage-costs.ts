"use server";

import { prismadb } from "@/lib/prisma";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { summarizeHomepageCost, type TargetCostSummary } from "@/lib/homepage/cost";

export type HomepageCostRow = {
  targetId: string;
  company: string;
  summary: TargetCostSummary;
};

export async function getHomepageCostsForAdmin(): Promise<
  { data: HomepageCostRow[] } | { error: string }
> {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const homepages = await prismadb.crm_Target_Homepage.findMany({
    where: { deletedAt: null },
    select: {
      targetId: true,
      target: { select: { company: true } },
      versions: {
        select: {
          pass_kind: true,
          model: true,
          created_at: true,
          input_tokens: true,
          output_tokens: true,
          cache_read_tokens: true,
          cache_creation_tokens: true,
        },
      },
    },
  });

  const rows: HomepageCostRow[] = homepages.map((h) => ({
    targetId: h.targetId,
    company: h.target?.company ?? "(unknown)",
    summary: summarizeHomepageCost(h.versions),
  }));

  rows.sort((a, b) => {
    const at = a.summary.lastGenerationAt?.getTime() ?? 0;
    const bt = b.summary.lastGenerationAt?.getTime() ?? 0;
    return bt - at; // newest first; never-generated (0) sink to the bottom
  });

  return { data: rows };
}
