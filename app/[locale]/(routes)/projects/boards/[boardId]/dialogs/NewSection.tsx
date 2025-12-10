"use client";

import { z } from "zod";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import LoadingComponent from "@/components/LoadingComponent";

type Props = {
  boardId: string;
};

const NewSectionDialog = ({ boardId }: Props) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const formSchema = z.object({
    title: z.string().min(3).max(255),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<NewAccountFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  //Actions

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);
    try {
      await axios.post(`/api/projects/sections/${boardId}`, data);
      toast({
        title: "Success",
        description: `New section: ${data.title}, created successfully`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data,
      });
    } finally {
      form.reset({
        title: "",
      });
      setIsLoading(false);
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="px-2">Create new section</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create new section</DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new section to this project.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingComponent />
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New section name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Enter section name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewSectionDialog;
