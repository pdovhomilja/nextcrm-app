"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteTask = async (data: { id: string; section?: string }) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { id } = data;
  if (!id) return { error: "Missing task ID" };

  try {
    const currentTask = await prismadb.tasks.findUnique({
      where: { id },
    });

    // Delete all task comments first (foreign key constraint)
    await prismadb.tasksComments.deleteMany({
      where: { task: id },
    });

    await prismadb.tasks.delete({
      where: { id },
    });

    if (currentTask) {
      // Reorder remaining tasks in the section
      const tasks = await prismadb.tasks.findMany({
        where: { section: currentTask.section },
        orderBy: { position: "asc" },
      });

      for (const key in tasks) {
        const position = parseInt(key);
        await prismadb.tasks.update({
          where: { id: tasks[key].id },
          data: {
            updatedBy: session.user.id,
            position,
          },
        });
      }
    }

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_TASK]", error);
    return { error: "Failed to delete task" };
  }
};
