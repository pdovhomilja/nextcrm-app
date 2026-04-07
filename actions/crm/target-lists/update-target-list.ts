"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const updateTargetList = async (data: {
  id: string;
  name?: string;
  description?: string;
  status?: boolean;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { id, name, description, status } = data;
  if (!id) return { error: "id is required" };

  try {
    const existing = await prismadb.crm_TargetLists.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { error: "Target list not found" };
    const list = await prismadb.crm_TargetLists.update({
      where: { id },
      data: { name, description, status },
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { data: list };
  } catch (error) {
    return { error: "Failed to update target list" };
  }
};
