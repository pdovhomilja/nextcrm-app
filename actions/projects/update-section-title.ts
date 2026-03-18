"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const updateSectionTitle = async (data: {
  sectionId: string;
  newTitle: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { sectionId, newTitle } = data;
  if (!sectionId) return { error: "Missing section ID" };

  try {
    await prismadb.sections.update({
      where: { id: sectionId },
      data: { title: newTitle },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[UPDATE_SECTION_TITLE]", error);
    return { error: "Failed to update section title" };
  }
};
