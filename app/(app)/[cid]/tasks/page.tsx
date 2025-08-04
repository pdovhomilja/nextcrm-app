import { getBoards } from "@/actions/tasks/get-boards";

import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CreateBoardButton from "./_components/create-board-button";
import BoardActions from "./_components/board-actions";
import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

const TaskPage = async () => {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new Error("User session or email not found");
  }
  
  const user = await getUserByEmail(session.user.email);
  
  if (!user?.id) {
    throw new Error("User not found");
  }
  
  const boards = await getBoards(user.id);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Project Management</h1>
      <div className="flex justify-end">
        <CreateBoardButton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map((board) => (
          <Card key={board.id} className="p-4">
            <CardHeader className="flex flex-row justify-between">
              <Link href={`/${user?.cid}/tasks/${board.id}`}>
                {" "}
                <CardTitle>{board.name}</CardTitle>
              </Link>

              <BoardActions boardId={board.id} boardName={board.name} />
            </CardHeader>
            <CardContent className="flex flex-row justify-between ">
              <p>{board.description}</p>
            </CardContent>
            <CardFooter className="flex flex-row justify-between">
              <p className="text-xs text-muted-foreground">
                Created: {formatDistanceToNowStrict(board.createdAt)} ago
              </p>
              <p className="text-xs text-muted-foreground">
                Updated: {formatDistanceToNowStrict(board.updatedAt)} ago
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TaskPage;
