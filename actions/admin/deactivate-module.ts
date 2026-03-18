"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deactivateModule = async (moduleId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!moduleId) return { error: "moduleId is required" };

  try {
    const module = await prismadb.system_Modules_Enabled.update({
      where: { id: moduleId },
      data: { enabled: false },
    });
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: module };
  } catch (error) {
    console.log("[DEACTIVATE_MODULE]", error);
    return { error: "Failed to deactivate module" };
  }
};
