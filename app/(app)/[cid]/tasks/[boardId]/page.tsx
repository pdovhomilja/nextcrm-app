import { getBoardSections } from "@/actions/tasks/get-board-sections";
import React from "react";
import { getBoard } from "@/actions/tasks/get-board";
import DndBoard from "./_components/dnd-board";
import TaskErrorBoundary from "../_components/error-boundary";

const BoardPage = async ({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) => {
  const { boardId } = await params;
  const boardSections = await getBoardSections(boardId);
  const board = await getBoard(boardId);

  if (!board) {
    return <div>Board not found</div>;
  }

  return (
    <TaskErrorBoundary>
      <DndBoard initialSections={boardSections} board={board} boardId={boardId} />
    </TaskErrorBoundary>
  );
};

export default BoardPage;
