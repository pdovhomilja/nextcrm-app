"use client";

import moment from "moment";
import Link from "next/link";

import { TeamConversations } from "../../tasks/viewtask/[taskId]/components/team-conversation";
import { useToast } from "@/components/ui/use-toast";

import { useRouter } from "next/navigation";
import { getTaskDone } from "../../actions/get-task-done";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CheckSquare, Eye, MessagesSquare } from "lucide-react";

interface DashboardData {
  getTaskPastDue: Tasks[];
  getTaskPastDueInSevenDays: Tasks[];
}

export interface Tasks {
  id: string;
  title: string;
  content: string;
  dueDateAt: Date;
  priority: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectDashboardCockpit = ({
  dashboardData,
}: {
  dashboardData: DashboardData;
}) => {
  const { toast } = useToast();
  const router = useRouter();

  //Actions
  const onDone = async (taskId: string) => {
    try {
      await getTaskDone(taskId);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error, task not marked as done.",
      });
    } finally {
      toast({
        title: "Success, task marked as done.",
      });
      router.refresh();
    }
  };

  //Console logs

  return (
    <div className="flex flex-col md:flex-row items-start justify-center h-full w-full overflow-auto">
      <div className="w-full md:w-1/2">
        <div>
          <h2 className="font-bold text-lg ">
            Tasks due Today ({dashboardData?.getTaskPastDue?.length})
          </h2>
          {/*         <pre>
            <code>{JSON.stringify(dashboardData, null, 2)}</code>
          </pre> */}
        </div>
        {dashboardData?.getTaskPastDue?.map((task: Tasks) => (
          <Card key={task.id} className="m-2">
            <CardHeader>
              <CardTitle className="text-xl">
                {task.title === "" ? "Untitled" : task.title}
              </CardTitle>
              <CardDescription>{task.content}</CardDescription>
            </CardHeader>
            <CardContent>
              <div>Due date: {moment(task.dueDateAt).format("YYYY-MM-DD")}</div>
              <div>
                <p
                  className={
                    task.priority === "normal"
                      ? `text-yellow-500`
                      : task.priority === "high"
                      ? `text-red-500`
                      : task.priority === "low"
                      ? `text-green-500`
                      : `text-slate-600`
                  }
                >
                  Priorita: {task.priority}
                </p>
              </div>
            </CardContent>
            <CardFooter className="space-x-2">
              <Link href={`/projects/tasks/viewtask/${task.id}`}>
                <Badge variant={"outline"}>
                  <Eye className="w-4 h-4 mr-2" />
                  <span>View task</span>
                </Badge>
              </Link>
              <Sheet>
                <SheetTrigger asChild>
                  <Badge variant={"outline"}>
                    <MessagesSquare className="w-4 h-4 mr-2" />
                    <span>Chat</span>
                  </Badge>
                </SheetTrigger>
                <SheetContent className="cursor-pointer">
                  <SheetHeader>
                    <SheetTitle>Team conversation</SheetTitle>
                  </SheetHeader>
                  <TeamConversations taskId={task.id} data={task.comments} />
                </SheetContent>
              </Sheet>
              <Badge variant={"outline"} onClick={() => onDone(task.id)}>
                <CheckSquare className="w-4 h-4 mr-2" />
                <span>Mark as done</span>
              </Badge>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="w-full pt-5 md:w-1/2 md:pt-0">
        <div>
          <h2 className="font-bold text-lg ">
            Tasks due in 7 days (
            {dashboardData?.getTaskPastDueInSevenDays?.length})
          </h2>
        </div>
        {dashboardData?.getTaskPastDueInSevenDays?.map((task: Tasks) => (
          <Card key={task.id} className="m-2">
            <CardHeader>
              <CardTitle className="text-xl">
                {task.title === "" ? "Untitled" : task.title}
              </CardTitle>
              <CardDescription>{task.content}</CardDescription>
            </CardHeader>
            <CardContent>
              <div>Due date: {moment(task.dueDateAt).format("YYYY-MM-DD")}</div>
              <div>
                <p
                  className={
                    task.priority === "normal"
                      ? `text-yellow-500`
                      : task.priority === "high"
                      ? `text-red-500`
                      : task.priority === "low"
                      ? `text-green-500`
                      : `text-slate-600`
                  }
                >
                  Priorita: {task.priority}
                </p>
              </div>
            </CardContent>
            <CardFooter className="space-x-2">
              <Link href={`/projects/tasks/viewtask/${task.id}`}>
                <Badge variant={"outline"}>
                  <Eye className="w-4 h-4 mr-2" />
                  <span>View task</span>
                </Badge>
              </Link>

              <Sheet>
                <SheetTrigger asChild>
                  <Badge variant={"outline"}>
                    <MessagesSquare className="w-4 h-4 mr-2" />
                    <span>Chat</span>
                  </Badge>
                </SheetTrigger>

                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Team conversation</SheetTitle>
                  </SheetHeader>
                  <TeamConversations taskId={task.id} data={task.comments} />
                </SheetContent>
              </Sheet>

              <Badge variant={"outline"} onClick={() => onDone(task.id)}>
                <CheckSquare className="w-4 h-4 mr-2" />
                <span>Mark as done</span>
              </Badge>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProjectDashboardCockpit;
