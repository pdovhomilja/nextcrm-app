"use client";

import axios from "axios";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getTaskDone } from "@/app/[locale]/(routes)/projects/actions/get-task-done";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import UpdateTaskDialog from "@/app/[locale]/(routes)/projects/dialogs/UpdateTask";
import { getActiveUsers } from "@/actions/get-users";
import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { initial } from "cypress/types/lodash";

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

  const [openEdit, setOpenEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  //console.log(initialData, "initialData");
  //console.log(openEdit, "openEdit");

  //Actions
  const onDone = async () => {
    setIsLoading(true);
    try {
      await getTaskDone(taskId);
      toast({
        title: "Success, task marked as done.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error, task not marked as done.",
      });
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  return (
    <div className="space-x-2 pb-2">
      Task Actions:
      <Separator className="mb-5" />
      {initialData.taskStatus !== "COMPLETE" && (
        <Badge
          variant={"outline"}
          onClick={onDone}
          className="cursor-pointer"
          aria-disabled={isLoading}
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          {isLoading ? (
            <Icons.spinner className="animate-spin w-4 h-4 mr-2" />
          ) : (
            "Mark as done"
          )}
        </Badge>
      )}
      <Badge
        variant={"outline"}
        className="cursor-pointer"
        onClick={() => setOpenEdit(true)}
      >
        <Pencil className="w-4 h-4 mr-2" />
        Edit
      </Badge>
      <Sheet open={openEdit} onOpenChange={() => setOpenEdit(false)}>
        <SheetContent>
          <UpdateTaskDialog
            users={users}
            boards={boards}
            initialData={initialData}
            onDone={() => setOpenEdit(false)}
          />
          <div className="flex pt-2 w-full justify-end">
            <Button onClick={() => setOpenEdit(false)} variant={"destructive"}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TaskViewActions;
