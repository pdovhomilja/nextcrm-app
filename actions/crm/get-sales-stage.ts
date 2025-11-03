"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getSaleStages = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Opportunities_Sales_Stages.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    orderBy: {
      probability: "asc",
    },
  });
  return data;
};
