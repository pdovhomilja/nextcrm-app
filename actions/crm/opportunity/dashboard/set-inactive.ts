"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export async function setInactiveOpportunity(id: string) {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthenticated" };
  }

  console.log(id, "id");

  if (!id) {
    console.log("Opportunity id is required");
  }
  try {
    const opportunity = await prismadb.crm_Opportunities.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        assigned_to: true,
      },
    });

    if (!opportunity) {
      return { error: "Opportunity not found" };
    }

    if (!session.user.role === "admin" && opportunity.assigned_to !== session.user.id) {
      return { error: "Forbidden" };
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
