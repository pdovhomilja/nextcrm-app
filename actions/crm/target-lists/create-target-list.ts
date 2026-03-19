"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const createTargetList = async (data: {
  name: string;
  description?: string;
  targetIds?: string[];
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { name, description, targetIds = [] } = data;
  if (!name) return { error: "name is required" };

  try {
    const list = await prismadb.crm_TargetLists.create({
      data: {
        name,
        description,
        created_by: (session.user as any).id,
        targets: {
          create: targetIds.map((id: string) => ({ target_id: id })),
        },
      },
      include: { targets: true },
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { data: list };
  } catch (error) {
    return { error: "Failed to create target list" };
  }
};
