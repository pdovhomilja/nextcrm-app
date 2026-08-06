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
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import { useTranslations } from "next-intl";
import { createSection } from "@/actions/projects/create-section";

type Props = {
  boardId: string;
};

const NewSectionDialog = ({ boardId }: Props) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const t = useTranslations("ProjectsPage");

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
    setOpen(false);
    setIsLoading(true);
    try {
      const result = await createSection({ boardId, title: data.title });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`New section: ${data.title}, created successfully`);
      }
    } catch (error: any) {
      toast.error(error?.message);
    } finally {
      form.reset({
        title: "",
      });
      setIsLoading(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="px-2" disabled={isLoading}>
          {isLoading ? <Loader /> : t("newSection.trigger")}
        </Button>
      </DialogTrigger>
      {isLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60">
          <Loader />
        </div>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newSection.title")}</DialogTitle>
          <DialogDescription>
            {t("newSection.description")}
          </DialogDescription>
        </DialogHeader>
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
                  <FormLabel>{t("newSection.nameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("newSection.namePlaceholder")}
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
                {t("newSection.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {t("newSection.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewSectionDialog;
