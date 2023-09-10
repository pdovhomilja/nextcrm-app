import { getBoard } from "@/actions/projects/get-board";
import React, { Suspense } from "react";

import Container from "@/app/[locale]/(routes)/components/ui/Container";
import NewSectionDialog from "./dialogs/NewSection";

import NewTaskInProjectDialog from "./dialogs/NewTaskInProject";
import { getActiveUsers } from "@/actions/get-users";
import { getBoardSections } from "@/actions/projects/get-board-sections";
import DeleteProjectDialog from "./dialogs/DeleteProject";
import { getKanbanData } from "@/actions/projects/get-kanban-data";
import Kanban from "./components/Kanban";

interface BoardDetailProps {
  params: { boardId: string };
}

const BoardPage = async ({ params }: BoardDetailProps) => {
  const { boardId } = params;
  const board: any = await getBoard(boardId);

  const users: any = await getActiveUsers();
  const sections: any = await getBoardSections(boardId);
  const kanbanData = await getKanbanData(boardId);

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
      <Kanban data={kanbanData.sections} boardId={boardId} />
    </Container>
  );
};

export default BoardPage;
