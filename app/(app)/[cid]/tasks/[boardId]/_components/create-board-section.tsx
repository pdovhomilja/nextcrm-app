"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { FormControl } from "@/components/ui/form";
import { FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod/v3';

import { useRouter } from "next/navigation";
import { createBoardSection } from "@/actions/tasks/create-board-section";
import { Plus } from "lucide-react";
import type { BoardSection } from "../../_types";

const formSchema = z.object({
  name: z.string().min(1, "Section name is required"),
});

const CreateBoardSectionButton = ({
  boardId,
  onSectionCreated,
}: {
  boardId: string;
  onSectionCreated?: (newSection: BoardSection) => Promise<void>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const newSection = await createBoardSection(boardId, data.name);

    // Call the callback to update the parent component's state
    if (onSectionCreated) {
      await onSectionCreated({
        id: newSection.id,
        name: newSection.name,
        position: newSection.position,
        tasks: [], // New sections start with no tasks
      });
    }

    setIsOpen(false);
    form.reset();
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex flex-row gap-2">
          <Plus size={16} />
          <span>Create Board Section</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Board Section</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Create a new board section for this board ({boardId.slice(0, 6)}
          ...).
        </DialogDescription>
        <div className="grid gap-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} placeholder="Board section name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={form.handleSubmit(onSubmit)}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBoardSectionButton;
