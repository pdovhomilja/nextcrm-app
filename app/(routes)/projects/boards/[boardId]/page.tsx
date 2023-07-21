import { getBoard } from "@/actions/projects/get-board";
import React from "react";
import BoardDasboard from "./components/Board";
import { getTasks } from "@/actions/projects/get-tasks";

import Container from "@/app/(routes)/components/ui/Container";
import NewSectionDialog from "./dialogs/NewSection";

import NewTaskInProjectDialog from "./dialogs/NewTaskInProject";
import { getUsers } from "@/actions/get-users";
import { getBoardSections } from "@/actions/projects/get-board-sections";
import DeleteProjectDialog from "./dialogs/DeleteProject";

interface BoardDetailProps {
  params: { boardId: string };
}

const BoardPage = async ({ params }: BoardDetailProps) => {
  const { boardId } = params;
  const board: any = await getBoard(boardId);
  const tasks: any = await getTasks();
  const users: any = await getUsers();
  const sections: any = await getBoardSections(boardId);

  return (
    <Container
      title={board?.board?.title}
      description={board?.board?.description}
    >
      <div className="flex justify-between py-5 w-full">
        <div className="space-x-2">
          <NewSectionDialog boardId={boardId} />
          <NewTaskInProjectDialog
            boardId={boardId}
            users={users}
            sections={sections}
          />
        </div>
        <div>
          <DeleteProjectDialog
            boardId={boardId}
            boardName={board.board.title}
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <BoardDasboard boardData={board} tasks={tasks} />
      </div>
    </Container>
  );
};

export default BoardPage;
