import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { getTask } from "@/actions/tasks/get-task";

const TaskDetailPage = async ({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) => {
  const { taskId } = await params;

  const task = await getTask(taskId);

  return (
    <SidebarInset>
      <SiteHeader title="Task Detail">
        <div className="flex items-center gap-2">{/* Nav buttons */}</div>
      </SiteHeader>
      <div className="flex flex-1 flex-col border-black">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex justify-end">{/* Nav buttons */}</div>
              <div className="px-4 lg:px-6">
                <pre>{JSON.stringify(task, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
};

export default TaskDetailPage;
