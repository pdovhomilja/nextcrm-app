import { getBoard } from "@/actions/projects/get-board";
import React from "react";

interface BoardDetailProps {
  params: { boardId: string };
}

const BoardPage = async ({ params }: BoardDetailProps) => {
  const { boardId } = params;
  const board = await getBoard(boardId);
  return (
    <div>
      <pre>{JSON.stringify(board, null, 2)}</pre>
    </div>
  );
};

export default BoardPage;
