"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  requireAuth,
  verifyBoardAccess,
} from "@/lib/security/company-access-validator";

export async function deleteBoardSection(sectionId: string, boardId: string) {
  const { userId, activeCompanyId } = await requireAuth();
  await verifyBoardAccess(boardId, userId, activeCompanyId);

  try {
    // Check if board section is empty
    const tasks = await db.task.findMany({
      where: { boardSectionId: sectionId },
    });
    if (tasks.length > 0) {
      return {
        message:
          "Board section is not empty. Delete tasks first or move them to another section.",
      };
    }

    await db.boardSection.delete({
      where: { id: sectionId },
    });
    revalidatePath(`/${activeCompanyId}/tasks/${boardId}`);
    return { message: "Board section deleted successfully" };
  } catch (error) {
    throw new Error(
      `Failed to delete board section: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
