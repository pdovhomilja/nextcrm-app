"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteLead = async (leadId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!leadId) return { error: "leadId is required" };

  try {
    await prismadb.crm_Leads.delete({ where: { id: leadId } });
    revalidatePath("/[locale]/(routes)/crm/leads", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_LEAD]", error);
    return { error: "Failed to delete lead" };
  }
};
