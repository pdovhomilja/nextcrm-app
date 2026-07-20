import { cache } from "react";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, assertCanReadOpportunity } from "@/lib/authz";

// Read-scoped: the caller must be able to read the parent opportunity. Auth is
// resolved inside the cache() body via next/headers (available in the RSC
// callers of this function); requireAuthenticated / assertCanReadOpportunity
// throw on denial, so the caller must be within a read-authorized page.
export const getOpportunityLineItems = cache(async (opportunityId: string) => {
  const user = await requireAuthenticated();
  await assertCanReadOpportunity(user, opportunityId);
  return prismadb.crm_OpportunityLineItems.findMany({
    where: { opportunityId },
    include: {
      product: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { sort_order: "asc" },
  });
});
