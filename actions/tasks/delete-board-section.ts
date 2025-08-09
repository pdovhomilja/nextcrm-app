"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";

export async function deleteBoardSection(sectionId: string, boardId: string) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error("User not authenticated");
    }

    const user = await getUserByEmail(session.user.email);
    if (!user?.id || !user?.cid) {
      throw new Error("User not found or missing company information");
    }

    //check if board is empty
    const board = await db.task.findMany({
      where: {
        boardSectionId: sectionId,
      },
    });
    if (board.length > 0) {
      return {
        message:
          "Board section is not empty. Delete tasks first or move them to another section.",
      };
    }

    await db.boardSection.delete({
      where: {
        id: sectionId,
      },
    });
    revalidatePath(`/${user.cid}/tasks/${boardId}`);
    return { message: "Board section deleted successfully" };
  } catch (error) {
    throw new Error(
      `Failed to delete board section: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
