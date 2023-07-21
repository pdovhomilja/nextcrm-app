"use client";

import moment from "moment";
import Link from "next/link";
import { useState } from "react";

import toast, { Toaster } from "react-hot-toast";
import { ChatBubbleIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { CheckCheck, EyeIcon } from "lucide-react";
import { CheckIcon } from "lucide-react";

type Props = {
  dashboardData: any;
};

const ProjectDashboardCockpit = ({ dashboardData }: Props) => {
  const [selectedTask, setSelectedTask] = useState(undefined);
  const [openChat, setOpenChat] = useState(false);

  //Console logs

  return (
    <div className="flex flex-row items-start justify-center h-full w-full">
      {/* Toasts */}
      <Toaster toastOptions={{ position: "top-right", duration: 1500 }} />
      {/* Modals */}
      {/*       <ChatModal
        openChat={openChat}
        setOpenChat={setOpenChat}
        task={selectedTask}
      /> */}
      {/*     <pre>{JSON.stringify(dashboardData, null, 2)}</pre> */}
      <div className="w-1/2">
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
              <CheckCheck
                aria-label="Mark as done"
                className="w-4 h-4 text-slate-600"
                onClick={async () => {
                  toast.loading("Marking task as done...");
                  await setSelectedTask(task);

                  toast.success("Task marked as done");
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="w-1/2">
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
                    toast.loading("Marking task as done...");
                    await setSelectedTask(task);

                    toast.success("Task marked as done");
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
