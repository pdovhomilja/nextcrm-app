"use client";

import moment from "moment";
import Link from "next/link";
import { useState } from "react";

import { ChatBubbleIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { CheckCheck, EyeIcon, CheckIcon } from "lucide-react";

import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { TeamConversations } from "../../tasks/viewtask/[taskId]/components/team-conversation";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

type Props = {
  dashboardData: any;
};

const ProjectDashboardCockpit = ({ dashboardData }: Props) => {
  //TODO: fix any
  const [selectedTask, setSelectedTask]: any = useState(undefined);
  const [openChat, setOpenChat] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  //Actions
  const onDone = async (taskId: string) => {
    try {
      await axios.post(`/api/projects/tasks/mark-task-as-done/${taskId}`);
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
      {/* Modals */}

      <RightViewModalNoTrigger
        title={`Chat about task: ${selectedTask?.title}`}
        description="Chat with your team members about this task."
        open={openChat}
        setOpen={setOpenChat}
      >
        <div className="flex flex-col justify-between items-center w-[500px]">
          <TeamConversations
            taskId={selectedTask?.id}
            data={selectedTask?.comments}
          />
        </div>
      </RightViewModalNoTrigger>

      <div className="w-full md:w-1/2">
        <div>
          <h2 className="font-bold text-lg ">
            Tasks due Today ({dashboardData?.getTaskPastDue?.length})
          </h2>
        </div>
        {dashboardData?.getTaskPastDue?.map((task: any, index: any) => (
          <div
            key={index}
            className="flex flex-col overflow-hidden items-start justify-center text-xs p-2 m-2 rounded-md border border-slate-300 shadow-md "
          >
            <div className="flex flex-row justify-between mx-auto w-full">
              <h2 className="font-bold text-sm ">
                {task.title === "" ? "Untitled" : task.title}
              </h2>
              {task?.dueDateAt && task?.dueDateAt > Date.now() ? (
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
              ) : null}
            </div>
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
            <div>
              <p className="line-clamp-2">{task.content}</p>
            </div>
            <div className="flex  gap-2 py-2">
              <Link href={`/projects/tasks/viewtask/${task.id}`}>
                <EyeIcon className="w-4 h-4 text-slate-600" />
              </Link>
              <ChatBubbleIcon
                className="w-4 h-4 text-slate-600"
                onClick={async () => {
                  await setSelectedTask(task);
                  setOpenChat(true);
                }}
              />
              <CheckIcon
                aria-label="Mark as done"
                className="w-4 h-4 text-slate-600"
                onClick={async () => {
                  await setSelectedTask(task);
                  await onDone(task.id);
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="w-full pt-5 md:w-1/2 md:pt-0">
        <div>
          <h2 className="font-bold text-lg ">
            Tasks due in 7 days (
            {dashboardData?.getTaskPastDueInSevenDays?.length})
          </h2>
        </div>
        {dashboardData?.getTaskPastDueInSevenDays?.map(
          (task: any, index: any) => (
            <div
              key={index}
              className="flex flex-col overflow-hidden items-start justify-center text-xs p-2 m-2  rounded-md border border-slate-300 shadow-md "
            >
              <div className="flex flex-row justify-between mx-auto w-full">
                <h2 className="font-bold text-sm ">
                  {task.title === "" ? "Untitled" : task.title}
                </h2>
                {task?.dueDateAt && task.dueDateAt > Date.now() && (
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                )}
              </div>
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
              <div>
                <p className="line-clamp-2">{task.content}</p>
              </div>
              <div className="flex  gap-2 py-2">
                <Link href={`/projects/tasks/viewtask/${task.id}`}>
                  <EyeIcon className="w-4 h-4 text-slate-600" />
                </Link>
                <ChatBubbleIcon
                  className="w-4 h-4 text-slate-600"
                  onClick={async () => {
                    await setSelectedTask(task);
                    setOpenChat(true);
                  }}
                />
                <CheckIcon
                  aria-label="Mark as done"
                  className="w-4 h-4 text-slate-600"
                  onClick={async () => {
                    await setSelectedTask(task);
                    await onDone(task.id);
                  }}
                />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ProjectDashboardCockpit;
