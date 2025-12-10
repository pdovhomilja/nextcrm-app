"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import React, { useEffect, useState } from "react";

type Props = {
  boardId: string;
  boardName: string;
};

const DeleteProjectDialog = ({ boardId, boardName }: Props) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  //Actions

  const onDelete = async () => {
    setIsLoading(true);
    try {
      await axios.delete(`/api/projects/${boardId}`);
      toast({
        title: "Success",
        description: `Project: ${boardName} deleted successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deleting project. Please try again.",
      });
    } finally {
      setOpen(false);
      setIsLoading(false);
      router.refresh();
      router.push("/projects");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="px-2" variant={"destructive"} asChild>
          <div className="px-3 gap-2">
            Delete project
            <TrashIcon size={15} />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this project? You will not be able
            to recover it. All tasks will be deleted as well.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProjectDialog;
