"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendEmail } from "@/actions/emails/messages";
import { useRouter } from "next/navigation";
import type { Mail } from "@/app/[locale]/(routes)/emails/data";

type Mode = "new" | "reply" | "forward";

type Props = {
  accountId: string;
  mode?: Mode;
  replyTo?: Mail;
  trigger?: React.ReactNode;
};

export function ComposeModal({
  accountId,
  mode = "new",
  replyTo,
  trigger,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTo =
    mode === "reply" ? replyTo?.fromEmail ?? "" : "";
  const defaultSubject =
    mode === "reply"
      ? `Re: ${replyTo?.subject ?? ""}`
      : mode === "forward"
        ? `Fwd: ${replyTo?.subject ?? ""}`
        : "";
  const defaultBody =
    mode === "reply" || mode === "forward"
      ? `\n\n--- Original ---\n${replyTo?.bodyText ?? ""}`
      : "";

  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await sendEmail({
        accountId,
        to: to.split(",").map((e) => e.trim()).filter(Boolean),
        cc: cc.split(",").map((e) => e.trim()).filter(Boolean),
        subject,
        body,
        inReplyTo: mode === "reply" ? replyTo?.rfcMessageId : undefined,
        references:
          mode === "reply" ? replyTo?.rfcMessageId : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Compose</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "reply" ? "Reply" : mode === "forward" ? "Forward" : "New Email"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" />
          </div>
          <div className="space-y-1">
            <Label>CC</Label>
            <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSend} disabled={sending} className="w-full">
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
