"use client";

import LoadingComponent from "@/components/LoadingComponent";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import React, { useEffect, useState } from "react";
import { set, useForm } from "react-hook-form";
import { z } from "zod";

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
      //set timeout to simulate loading
      //await new Promise((resolve) => setTimeout(resolve, 5000));
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
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle className="p-2">Delete project</DialogTitle>
          <DialogDescription className="p-2">
            Are you sure you want to delete this project? You will not be able
            to recover it. All tasks will be deleted as well.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="space-x-2">
          <Button
            className="px-2"
            variant="default"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button className="px-2" variant="destructive" onClick={onDelete}>
            {isLoading && <span className="animate-pulse">Deleting ...</span>}
            {!isLoading && <span>Delete</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProjectDialog;
