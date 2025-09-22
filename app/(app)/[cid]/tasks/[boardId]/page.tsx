import { getBoardSections } from "@/actions/tasks/get-board-sections";
import React from "react";
import { getBoard } from "@/actions/tasks/get-board";
import DndBoard from "./_components/dnd-board";
import BulkDueDateButton from "./_components/bulk-due-date-button";
import TaskErrorBoundary from "../_components/error-boundary";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import type { BoardSection } from "../_types";

export const dynamic = "force-dynamic";

const BoardPage = async ({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) => {
  const { boardId } = await params;
  const boardSections: BoardSection[] = await getBoardSections(boardId);
  const board = await getBoard(boardId);

  if (!board) {
    return <div>Board not found</div>;
  }

  return (
    <TaskErrorBoundary>
      <SidebarInset>
        <SiteHeader title={board.name}>
          <div className="flex items-center gap-2">
            <BulkDueDateButton board={board} />
            {/*         <CreateBoardSectionButton
              boardId={boardId}
              onSectionCreated={handleSectionCreated}
            /> */}
          </div>
        </SiteHeader>
        <div className="flex flex-1 flex-col border-black">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-col gap-4 p-4">
                <DndBoard
                  initialSections={boardSections}
                  board={board}
                  boardId={boardId}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </TaskErrorBoundary>
  );
};

export default BoardPage;
