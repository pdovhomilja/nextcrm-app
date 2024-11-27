import { getTask } from "@/actions/projects/get-task";
import React from "react";
import moment from "moment";

import { getDocuments } from "@/actions/documents/get-documents";
import { getTaskComments } from "@/actions/projects/get-task-comments";
import { getTaskDocuments } from "@/actions/projects/get-task-documents";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { TeamConversations } from "./components/team-conversation";
import { TaskDataTable } from "./components/data-table";
import { columns } from "./components/columns";
import { columnsTask } from "./components/columns-task";

import TaskViewActions from "./components/TaskViewActions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Shield, User } from "lucide-react";
import { getActiveUsers } from "@/actions/get-users";
import { getBoards } from "@/actions/projects/get-boards";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type TaskPageProps = {
  params: Promise<{
    taskId: string;
  }>;
};

const TaskPage = async (props: TaskPageProps) => {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { taskId } = params;
  const task: any = await getTask(taskId);
  const taskDocuments: any = await getTaskDocuments(taskId);
  const documents: any = await getDocuments();
  const comments: any = await getTaskComments(taskId);
  const activeUsers: any = await getActiveUsers();
  const boards = await getBoards(user?.id!);

  //console.log(taskDocuments, "taskDocuments");

  return (
    <div className="flex flex-col md:flex-row w-full px-2 space-x-2 ">
      <div className="flex flex-col w-full md:w-2/3">
        <div className="w-full border rounded-lg mb-5">
          {/*           <pre>
            <code>{JSON.stringify(task, null, 2)}</code>
          </pre> */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{task.title}</CardTitle>
              <CardDescription>{task.content}</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <Calendar className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Date created
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {moment(task.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                    </p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <Calendar className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Date due</p>
                    <p className="text-sm text-muted-foreground">
                      {moment(task.dueDateAt).format("YYYY-MM-DD HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <Calendar className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Last modified
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {moment(task.lastEditedAt).format("YYYY-MM-DD HH:mm:ss")}
                    </p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <Shield className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Priority</p>
                    <Badge
                      variant={
                        task.priority === "high" ? `destructive` : `outline`
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <Shield className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Status</p>
                    <Badge
                      variant={
                        task.taskStatus === "COMPLETE"
                          ? `destructive`
                          : `outline`
                      }
                    >
                      {task.taskStatus}
                    </Badge>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <User className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Assigned to
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.assigned_user?.name || "Not assigned"}
                    </p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <User className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Created by
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activeUsers.find(
                        (user: any) => user.id === task.createdBy
                      )?.name || "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="space-x-2">
              <TaskViewActions
                taskId={taskId}
                users={activeUsers}
                boards={boards}
                initialData={task}
              />
            </CardFooter>
          </Card>
        </div>
        {/*         <pre>
          <code>{JSON.stringify(taskDocuments, null, 2)}</code>
        </pre> */}
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight py-5">
          Task documents ({taskDocuments.length})
        </h4>
        <TaskDataTable data={taskDocuments} columns={columnsTask} />
        <Separator />
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight py-5">
          Available documents ({documents.length})
        </h4>
        <TaskDataTable data={documents} columns={columns} />
      </div>

      <div className="w-full md:w-1/3">
        <TeamConversations data={comments} taskId={task.id} />
      </div>
    </div>
  );
};

export default TaskPage;
