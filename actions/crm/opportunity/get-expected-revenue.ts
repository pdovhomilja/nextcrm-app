"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getExpectedRevenue = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const activeOpportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      status: "ACTIVE",
      organizationId: session.user.organizationId,
    },
  });

  const totalAmount = activeOpportunities.reduce(
    (sum: number, opportunity: any) => sum + Number(opportunity.budget),
    0
  );

  return totalAmount;
};
