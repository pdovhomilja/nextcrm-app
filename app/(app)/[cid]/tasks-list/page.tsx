import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";

import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { TaskDataTable } from "@/components/dashboard/tables/task-data-table";

const TasksListPage = async () => {
  return (
    <SidebarInset>
      <SiteHeader title="Tasks List">
        <div className="flex items-center gap-2">{/* Nav buttons */}</div>
      </SiteHeader>
      <div className="flex flex-1 flex-col border-black">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex justify-end">{/* Nav buttons */}</div>
              <div className="px-4 lg:px-6">
                <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
                  <TaskDataTable className="w-full" />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
};

export default TasksListPage;
