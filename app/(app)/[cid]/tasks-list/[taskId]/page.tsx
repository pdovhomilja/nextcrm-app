import React, { Suspense } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { getTask } from "@/actions/tasks/get-task";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SmartSuggestions } from "@/components/ai/smart-suggestions";
import TaskDetailHeader from "./_components/task-detail-header";
import TaskSideRail from "./_components/task-side-rail";
import TaskFiles from "./_components/task-files";
import TaskActivity from "./_components/task-activity";
import TaskDescription from "./_components/task-description";
import { getUsers } from "@/actions/users/get-users";

const TaskDetailPage = async ({
  params,
}: {
  params: Promise<{ cid: string; taskId: string }>;
}) => {
  const { cid, taskId } = await params;

  const [task, users] = await Promise.all([getTask(taskId), getUsers()]);

  return (
    <SidebarInset>
      <SiteHeader title={task.title}>
        <div className="flex items-center gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${task.createdBy?.id ? "#" : "#"}`}>
                  Company
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${task.createdBy?.id ? "#" : "#"}`}>
                  Boards
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${task.createdBy?.id ? "#" : "#"}`}>
                  {task.boardSection?.board?.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{task.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </SiteHeader>
      <div className="flex flex-1 flex-col border-black">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
              <div className="lg:col-span-8 space-y-4">
                <TaskDetailHeader task={task} />
                <Tabs defaultValue="details" className="w-full">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="ai">AI</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details">
                    <Card>
                      <CardContent className="p-4">
                        <TaskDescription task={task} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="activity">
                    <Suspense
                      fallback={<div className="p-4">Loading activity...</div>}
                    >
                      {/* RSC render of history */}
                      <TaskActivity history={task.history ?? []} />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="files">
                    <Suspense
                      fallback={<div className="p-4">Loading files...</div>}
                    >
                      <TaskFiles task={task} companyId={cid} />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="ai">
                    <SmartSuggestions taskId={task.id} className="mt-2" />
                  </TabsContent>
                </Tabs>
              </div>
              <div className="lg:col-span-4">
                <TaskSideRail
                  task={task}
                  users={users.map((u) => ({
                    id: u.id,
                    name: u.name || u.email,
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
};

export default TaskDetailPage;
