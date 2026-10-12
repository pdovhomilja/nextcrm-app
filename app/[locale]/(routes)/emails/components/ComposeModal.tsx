"use client";

import { useState, forwardRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendEmail } from "@/actions/emails/messages";
import { EmailComposeEditor } from "@/app/[locale]/(routes)/emails/components/EmailComposeEditor";
import { useRouter } from "next/navigation";
import type { Mail } from "@/app/[locale]/(routes)/emails/data";
import {
  buildForwardedBody,
  buildReplyAllRecipients,
  emailPlainBody,
  plainTextToComposeHtml,
} from "@/lib/email/compose-helpers";

type Mode = "new" | "reply" | "reply-all" | "forward";

type Props = {
  accountId: string;
  mailboxAddress?: string;
  mode?: Mode;
  replyTo?: Mail | null;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  initialTo?: string;
  onSent?: () => void;
  onClose?: () => void;
  /** When true, dialog is opened programmatically (no trigger button). */
  headless?: boolean;
};

function initialFields(
  mode: Mode,
  replyTo: Mail | null | undefined,
  mailboxAddress: string,
  initialTo?: string
) {
  if (!replyTo || mode === "new") {
    return { to: initialTo?.trim() ?? "", cc: "", subject: "", body: "", bodyHtml: "<p></p>" };
  }

  if (mode === "reply") {
    return {
      to: replyTo.fromEmail ?? "",
      cc: "",
      subject: replyTo.subject?.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject ?? ""}`,
      body: `\n\n${quoteOriginal(replyTo)}`,
    };
  }

  if (mode === "reply-all") {
    const { to, cc } = buildReplyAllRecipients(replyTo, mailboxAddress);
    return {
      to: to.join(", "),
      cc: cc.join(", "),
      subject: replyTo.subject?.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject ?? ""}`,
      body: `\n\n${quoteOriginal(replyTo)}`,
    };
  }

  return {
    to: "",
    cc: "",
    subject: replyTo.subject?.startsWith("Fwd:") ? replyTo.subject : `Fwd: ${replyTo.subject ?? ""}`,
    body: buildForwardedBody(replyTo),
  };
}

function quoteOriginal(email: Mail): string {
  const from = email.fromName ?? email.fromEmail ?? "";
  const sent = email.sentAt ? new Date(email.sentAt).toLocaleString() : "";
  const body = emailPlainBody(email);
  return `On ${sent}, ${from} wrote:\n> ${body.split("\n").join("\n> ")}`;
}

export const ComposeModal = forwardRef<HTMLDivElement, Props>(function ComposeModal(
  {
    accountId,
    mailboxAddress = "",
    mode = "new",
    replyTo,
    trigger,
    defaultOpen = false,
    initialTo,
    onSent,
    onClose,
    headless = false,
  }: Props,
  ref
) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");

  useEffect(() => {
    if (!open) return;
    const fields = initialFields(mode, replyTo, mailboxAddress, initialTo);
    setTo(fields.to);
    setCc(fields.cc);
    setSubject(fields.subject);
    setBody(fields.body);
    setBodyHtml(plainTextToComposeHtml(fields.body));
    setError(null);
  }, [open, mode, replyTo, mailboxAddress, initialTo]);

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
        bodyHtml,
        inReplyTo: mode === "reply" || mode === "reply-all" ? replyTo?.rfcMessageId : undefined,
        references: mode === "reply" || mode === "reply-all" ? replyTo?.rfcMessageId : undefined,
      });
      setOpen(false);
      onSent?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const needsSource = mode !== "new";
  const sourceReady = !needsSource || Boolean(replyTo?.fromEmail && (replyTo.bodyText || replyTo.bodyHtml || replyTo.subject));

  return (
    <div ref={ref} className="inline-block">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onClose?.();
        }}
      >
        {!headless && (
          <DialogTrigger asChild>
            {trigger ?? (
              <Button size="sm" className="w-full rounded-lg shadow-sm">
                Compose
              </Button>
            )}
          </DialogTrigger>
        )}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "reply"
                ? "Reply"
                : mode === "reply-all"
                  ? "Reply all"
                  : mode === "forward"
                    ? "Forward"
                    : "New email"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {needsSource && !sourceReady && (
              <p className="text-sm text-muted-foreground">Loading message… open again in a moment.</p>
            )}
            <div className="space-y-1">
              <Label>To</Label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com, …"
              />
            </div>
            <div className="space-y-1">
              <Label>CC</Label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <EmailComposeEditor
                content={bodyHtml}
                onChange={(html, plain) => {
                  setBodyHtml(html);
                  setBody(plain);
                }}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={handleSend}
              disabled={sending || !to.trim() || !subject.trim() || (needsSource && !sourceReady)}
              className="w-full"
            >
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
