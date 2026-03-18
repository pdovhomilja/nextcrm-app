"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteSection = async (sectionId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!sectionId) return { error: "Missing section ID" };

  try {
    await prismadb.tasks.deleteMany({
      where: { section: sectionId },
    });

    await prismadb.sections.delete({
      where: { id: sectionId },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_SECTION]", error);
    return { error: "Failed to delete section" };
  }
};
