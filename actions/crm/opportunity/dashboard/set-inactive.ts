"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export async function setInactiveOpportunity(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  console.log(id, "id");

  if (!id) {
    console.log("Opportunity id is required");
  }
  try {
    // First verify the opportunity belongs to the user's organization
    const opportunity = await prismadb.crm_Opportunities.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!opportunity) {
      throw new Error("Unauthorized: Opportunity not found or access denied");
    }

    const result = await prismadb.crm_Opportunities.update({
      where: {
        id,
      },
      data: {
        status: "INACTIVE",
      },
    });

    console.log(result, "result");

    console.log("Opportunity has been set to inactive");
  } catch (error) {
    console.error(error);
  }
}
