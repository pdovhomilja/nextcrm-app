"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendMail } from "@/actions/mail/send-actions";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const MailCompose = ({
  accounts,
}: {
  accounts: { id: string; email: string }[];
}) => {
  const searchParams = useSearchParams();
  const accountId = searchParams.get("account");
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSend = async () => {
    if (!accountId) {
      toast.error("No account selected");
      return;
    }
    try {
      const result = await sendMail(accountId, to, subject, body);
      console.log("result", result);
      if (result.success) {
        toast.success("Email sent successfully");
      } else {
        toast.error("Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setTo("");
      setSubject("");
      setBody("");
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Button>Compose</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-3/4 md:w-1/2 lg:w-1/3 p-6">
        <SheetHeader>
          <SheetTitle>Compose new email</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            From: {accounts?.find((account) => account.id === accountId)?.email}
          </div>
          <Input
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            placeholder="Body"
            rows={15}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSend}>Send</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
