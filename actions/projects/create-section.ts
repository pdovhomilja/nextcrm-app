"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const createSection = async (data: {
  boardId: string;
  title: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { boardId, title } = data;
  if (!title) return { error: "Missing section title" };
  if (!boardId) return { error: "Missing board ID" };

  try {
    const sectionPosition = await prismadb.sections.count({
      where: { board: boardId },
    });

    const newSection = await prismadb.sections.create({
      data: {
        v: 0,
        board: boardId,
        title,
        position: sectionPosition > 0 ? sectionPosition : 0,
      },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { data: newSection };
  } catch (error) {
    console.log("[CREATE_SECTION]", error);
    return { error: "Failed to create section" };
  }
};
