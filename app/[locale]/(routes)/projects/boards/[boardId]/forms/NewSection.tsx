"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { DialogClose } from "@radix-ui/react-dialog";
import { createSection } from "@/actions/projects/create-section";

type NewSectionFormProps = {
  boardId: string;
  onClose: () => void;
};

const NewSectionForm = ({ boardId, onClose }: NewSectionFormProps) => {
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
      const result = await createSection({ boardId, title: data.title });
      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      } else {
        toast({
          title: "Success",
          description: `New section: ${data.title}, created successfully`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message,
      });
    } finally {
      form.reset({
        title: "",
      });
      setIsLoading(false);
      router.refresh();
      onClose();
    }
  };
  return (
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
        </div>
        <div className="flex w-full justify-end space-x-2 pt-2">
          <DialogClose asChild>
            <Button variant={"destructive"}>Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex space-x-5">
                <Icons.spinner className="animate-spin" />
              </div>
            ) : (
              <span>Create</span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default NewSectionForm;
