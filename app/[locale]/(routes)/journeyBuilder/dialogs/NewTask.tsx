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
import { useAppStore } from "@/store/store";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Props = {
  users: any;
  boards: any;
  open: boolean;
  setOpen: (open: boolean) => void;
  notionUrl: string;
};

const NewTaskDialog = ({
  users,
  boards,
  open,
  setOpen,
  notionUrl,
}: Props) => {
  //const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setIsOpen } = useAppStore();

  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const formSchema = z.object({
    title: z.string().min(3).max(255),
    user: z.string().min(3).max(255),
    board: z.string().min(3).max(255),
    priority: z.string().min(3).max(10),
    content: z.string().min(3).max(500),
    notionUrl: z.string().nullable(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<NewAccountFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    form.setValue("notionUrl", notionUrl); 
    setIsMounted(true);
  }, [notionUrl, form]);

  if (!isMounted) {
    return null;
  }

  //Actions

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);

    try {
      await axios.post(`/api/projects/tasks/create-task`, data);
      toast({
        title: "Success",
        description: `New task: ${data.title}, created successfully`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data,
      });
    } finally {
      setIsLoading(false);
      setOpen(false);
      form.reset({
        notionUrl: notionUrl,
      });
    }
    setIsLoading(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/*       <DialogTrigger>
        <Button className="px-2">Create task</Button>
      </DialogTrigger> */}
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle className="p-2">Create New Task</DialogTitle>
          <DialogDescription className="p-2">
            Fill out the form below to create a new task. This URL: {notionUrl}{" "}
            will be add as a part of your task description.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingComponent />
        ) : (
          <div className="flex flex-col w-full ">
            {/*     <pre>
              <code>{JSON.stringify(form.getValues(), null, 2)}</code>
            </pre> */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="h-full w-full space-y-3"
              >
                <div className="flex flex-col space-y-3">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New task name</FormLabel>
                        <FormControl>
                          <Input
                            disabled={isLoading}
                            placeholder="Enter task name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task description</FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={isLoading}
                            placeholder="Enter task description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="user"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned to</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select assigned user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="board"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Choose project</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tasks board" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {boards.map((board: any) => (
                              <SelectItem key={board.id} value={board.id}>
                                {board.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Choose task priority</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tasks priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex w-full justify-end space-x-2 pt-2">
                  <DialogTrigger asChild>
                    <Button variant={"destructive"}>Cancel</Button>
                  </DialogTrigger>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewTaskDialog;
