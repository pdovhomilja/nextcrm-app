import { cache } from "react";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, assertCanReadContract } from "@/lib/authz";

// Read-scoped: the caller must be able to read the parent contract. Auth is
// resolved inside the cache() body via next/headers (available in RSC callers);
// both helpers throw on denial.
export const getContractLineItems = cache(async (contractId: string) => {
  const user = await requireAuthenticated();
  await assertCanReadContract(user, contractId);
  return prismadb.crm_ContractLineItems.findMany({
    where: { contractId },
    include: {
      product: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { sort_order: "asc" },
  });
});
