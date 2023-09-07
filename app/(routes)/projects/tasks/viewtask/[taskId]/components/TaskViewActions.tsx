"use client";

import axios from "axios";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getTaskDone } from "@/app/(routes)/projects/actions/get-task-done";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import UpdateTaskDialog from "@/app/(routes)/projects/dialogs/UpdateTask";
import { getActiveUsers } from "@/actions/get-users";

const TaskViewActions = ({
  taskId,
  users,
  boards,
  initialData,
}: {
  taskId: string;
  users: any;
  boards: any;
  initialData: any;
}) => {
  const { toast } = useToast();
  const router = useRouter();

  //Actions
  const onDone = async () => {
    try {
      await getTaskDone(taskId);
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

  return (
    <div className="space-x-2 pb-2">
      Task Actions:
      <Separator className="mb-5" />
      <Badge variant={"outline"} onClick={onDone} className="cursor-pointer">
        <CheckSquare className="w-4 h-4 mr-2" />
        <span>Mark as done</span>
      </Badge>
      <Badge variant={"outline"} className="cursor-pointer">
        <Pencil className="w-4 h-4 mr-2" />
        <Sheet>
          <SheetTrigger>
            <span>Edit</span>
          </SheetTrigger>
          <SheetContent>
            <UpdateTaskDialog
              users={users}
              boards={boards}
              initialData={initialData}
            />
          </SheetContent>
        </Sheet>
      </Badge>
    </div>
  );
};

export default TaskViewActions;
