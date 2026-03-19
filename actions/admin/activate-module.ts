"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const activateModule = async (moduleId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!moduleId) return { error: "moduleId is required" };

  try {
    const module = await prismadb.system_Modules_Enabled.update({
      where: { id: moduleId },
      data: { enabled: true },
    });
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: module };
  } catch (error) {
    console.log("[ACTIVATE_MODULE]", error);
    return { error: "Failed to activate module" };
  }
};
