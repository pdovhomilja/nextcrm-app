"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { crm_Accounts } from "@prisma/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns } from "../tasks-data-table/components/columns";
import { TasksDataTable } from "../tasks-data-table/components/data-table";

import NewTaskForm from "./NewTaskForm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

//TODO:
interface TasksViewProps {
  data: any;
  account: crm_Accounts | null;
}

const AccountsTasksView = ({ data, account }: TasksViewProps) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/projects/tasks")}
              className="cursor-pointer"
            >
              Tasks
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button className="m-2 cursor-pointer">+</Button>
              </SheetTrigger>
              <SheetContent className="w-full overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Create new Task</SheetTitle>
                  <SheetDescription>
                    Create a new task for this account with assigned user, due
                    date, and priority
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <NewTaskForm
                    account={account}
                    onFinish={() => setOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          "No assigned tasks found"
        ) : (
          <TasksDataTable data={data} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsTasksView;
