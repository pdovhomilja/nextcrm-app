"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const updateTargetList = async (data: {
  id: string;
  name?: string;
  description?: string;
  status?: boolean;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { id, name, description, status } = data;
  if (!id) return { error: "id is required" };

  try {
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
