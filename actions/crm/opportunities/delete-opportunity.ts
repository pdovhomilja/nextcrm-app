"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteOpportunity = async (opportunityId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!opportunityId) return { error: "opportunityId is required" };

  try {
    await prismadb.crm_Opportunities.delete({ where: { id: opportunityId } });
    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_OPPORTUNITY]", error);
    return { error: "Failed to delete opportunity" };
  }
};
