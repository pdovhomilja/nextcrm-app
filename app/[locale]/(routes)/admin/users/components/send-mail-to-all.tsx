"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import React, { ElementRef, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { sendMailToAll } from "@/actions/admin/send-mail-to-all";

import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/form/form-input";
import { FormSubmit } from "@/components/form/form-submit";
import { FormTextarea } from "@/components/form/form-textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

import { useAction } from "@/hooks/use-action";

const SendMailToAll = () => {
  const closeRef = useRef<ElementRef<"button">>(null);
  const t = useTranslations("AdminPage");

  const { execute, fieldErrors, isLoading } = useAction(sendMailToAll, {
    onSuccess: (data) => {
      toast.success(t("sendMail.sent"));
      closeRef.current?.click();
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const onSendMail = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const message = formData.get("message") as string;

    await execute({ title, message });
  };

  return (
    <Sheet>
      <SheetTrigger ref={closeRef} asChild>
        <Button>{t("sendMail.trigger")}</Button>
      </SheetTrigger>
      <SheetContent className="max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("sendMail.title")}</SheetTitle>
          <SheetDescription>
            {t("sendMail.description")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <form action={onSendMail} className="space-y-4">
            <FormInput
              id="title"
              label={t("sendMail.messageTitle")}
              type="text"
              errors={fieldErrors}
            />
            <FormTextarea
              id="message"
              label={t("sendMail.message")}
              placeholder={t("sendMail.message")}
              required
              errors={fieldErrors}
            />
            <FormSubmit className="w-full">
              {isLoading ? (
                <Loader2 className="h-6 w-6  animate-spin" />
              ) : (
                t("sendMail.sendButton")
              )}
            </FormSubmit>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SendMailToAll;
