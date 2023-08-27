"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns } from "../../projects/tasks/components/columns";
import { TasksDataTable } from "../../projects/tasks/components/data-table";
import SheetComponent from "@/components/sheets/Sheet";
import NewTaskForm from "./NewTaskForm";
import { crm_Accounts } from "@prisma/client";

//TODO:
interface TasksViewProps {
  data: any;
  account: crm_Accounts | null;
}

const TasksView = ({ data, account }: TasksViewProps) => {
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
          "No assigned documents found"
        ) : (
          <TasksDataTable data={data} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default TasksView;
