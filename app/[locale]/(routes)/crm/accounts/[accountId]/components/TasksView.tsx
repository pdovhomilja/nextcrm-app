"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { crm_Accounts } from "@prisma/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import SheetComponent from "@/components/sheets/Sheet";

import { columns } from "../tasks-data-table/components/columns";
import { TasksDataTable } from "../tasks-data-table/components/data-table";

import NewTaskForm from "./NewTaskForm";

//TODO:
interface TasksViewProps {
  data: any;
  account: crm_Accounts | null;
}

const AccountsTasksView = ({ data, account }: TasksViewProps) => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

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
            <SheetComponent
              button_label="+"
              title={"Create Task for: " + account?.name}
            >
              <NewTaskForm account={account} />
            </SheetComponent>
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
