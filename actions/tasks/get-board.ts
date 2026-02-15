"use server";

import db from "@/lib/db";
import {
  requireAuth,
  verifyBoardAccess,
} from "@/lib/security/company-access-validator";

export async function getBoard(boardId: string) {
  const { userId, activeCompanyId } = await requireAuth();
  await verifyBoardAccess(boardId, userId, activeCompanyId);

  const board = await db.board.findUnique({
    where: { id: boardId },
  });
  return board;
}
