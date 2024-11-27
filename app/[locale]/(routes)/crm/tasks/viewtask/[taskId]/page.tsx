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
import { getCrMTask } from "@/actions/crm/account/get-task";

type TaskPageProps = {
  params: Promise<{
    taskId: string;
  }>;
};

const CRMTaskPage = async (props: TaskPageProps) => {
  const params = await props.params;
  const { taskId } = params;
  const task: any = await getCrMTask(taskId);
  const taskDocuments: any = await getTaskDocuments(taskId);
  const documents: any = await getDocuments();
  //Info: This is the same as the one in the CRM task page
  const comments: any = await getTaskComments(taskId);

  return (
    <div className="flex flex-col md:flex-row w-full px-2 space-x-2 ">
      <div className="flex flex-col w-full md:w-2/3">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight py-5">
          Task details
        </h4>
        <div className="w-full border rounded-lg mb-5">
          {/*          <pre>
            <code>{JSON.stringify(task, null, 2)}</code>
          </pre> */}
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b font-semibold">
                  <span className="flex justify-start">Property</span>
                </th>
                <th className="py-2 px-4 border-b font-semibold">
                  <span className="flex justify-start">Value</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-4 border-b">ID</td>
                <td className="py-2 px-4 border-b">{task.id}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">Date created</td>
                <td className="py-2 px-4 border-b">
                  {moment(task.createdAt).format("YYYY-MM-DD")}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">Date due</td>
                <td className="py-2 px-4 border-b">
                  {moment(task.dueDateAt).format("YYYY-MM-DD")}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">Date modified</td>
                <td className="py-2 px-4 border-b">
                  {moment(task.lastEditedAt).format("YYYY-MM-DD")}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">Priority</td>
                <td className="py-2 px-4 border-b">
                  <Badge
                    variant={
                      task.priority === "high" ? `destructive` : `outline`
                    }
                  >
                    {task.priority}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">Title</td>
                <td className="py-2 px-4 border-b">{task.title}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">Content</td>
                <td className="py-2 px-4 border-b">{task.content}</td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">Assigned to</td>
                <td className="py-2 px-4 border-b">
                  {task.assigned_user?.name || "Not assigned"}
                </td>
              </tr>
            </tbody>
          </table>
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

export default CRMTaskPage;
