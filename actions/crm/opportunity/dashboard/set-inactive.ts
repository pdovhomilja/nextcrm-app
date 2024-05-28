"use server";
import { prismadb } from "@/lib/prisma";

export async function setInactiveOpportunity(id: string) {
  console.log(id, "id");

  if (!id) {
    console.log("Opportunity id is required");
  }
  try {
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
