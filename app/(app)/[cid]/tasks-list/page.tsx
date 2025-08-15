import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { TaskDataTableServer } from "@/components/dashboard/tables/task-data-table-server";
import { auth } from "@/auth";
import { getUserById } from "@/actions/user";
import { redirect } from "next/navigation";
import { User } from "@/lib/generated/prisma";

interface TasksListPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const TasksListPage = async ({ searchParams }: TasksListPageProps) => {
  const resolvedSearchParams = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const user: User = await getUserById(session.user.id);

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
                <TaskDataTableServer
                  className="w-full"
                  user={user}
                  searchParams={resolvedSearchParams}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
};

export default TasksListPage;
