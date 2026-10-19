"use client";

import { useState, forwardRef, useEffect, useRef } from "react";
import { Paperclip, X } from "lucide-react";
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
import type { ConnectedAccount, Mail } from "@/app/[locale]/(routes)/emails/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  uploadComposeAttachment,
  type ComposeAttachmentMeta,
} from "@/lib/email/upload-compose-attachment";
import {
  buildForwardedBody,
  buildReplyAllRecipients,
  emailPlainBody,
  plainTextToComposeHtml,
  stripHtmlToPlain,
} from "@/lib/email/compose-helpers";
import { EmailAiWriter } from "@/components/email/EmailAiWriter";
import type { MailboxComposeMode } from "@/lib/llm/quality-modes";
import { getDefaultEmailSignatureHtml } from "@/lib/brand/vensai";

type Mode = "new" | "reply" | "reply-all" | "forward";

type Props = {
  accountId: string;
  mailboxAddress?: string;
  /** Mailboxes the user may send from (view-as / delegate / own). */
  accounts?: ConnectedAccount[];
  mode?: Mode;
  replyTo?: Mail | null;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  initialTo?: string;
  onSent?: () => void;
  onClose?: () => void;
  /** When true, dialog is opened programmatically (no trigger button). */
  headless?: boolean;
  /** Pre-fill AI instructions (e.g. from “AI reply” or assistant). */
  initialAiPrompt?: string;
  /** Run AI generate once when the dialog opens (assistant deep link). */
  autoGenerateAi?: boolean;
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
    accounts = [],
    mode = "new",
    replyTo,
    trigger,
    defaultOpen = false,
    initialTo,
    onSent,
    onClose,
    headless = false,
    initialAiPrompt = "",
    autoGenerateAi = false,
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
  const [sendFromAccountId, setSendFromAccountId] = useState(accountId);
  const [attachments, setAttachments] = useState<ComposeAttachmentMeta[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quotePlainRef = useRef("");

  const sendFromAccount =
    accounts.find((a) => a.id === sendFromAccountId) ??
    accounts.find((a) => a.id === accountId);
  const effectiveMailboxAddress = sendFromAccount?.username ?? mailboxAddress;

  useEffect(() => {
    if (!open) return;
    const fields = initialFields(mode, replyTo, mailboxAddress, initialTo);
    setTo(fields.to);
    setCc(fields.cc);
    setSubject(fields.subject);
    setBody(fields.body);
    setBodyHtml(plainTextToComposeHtml(fields.body));
    if (mode === "reply" || mode === "reply-all") {
      quotePlainRef.current = replyTo ? quoteOriginal(replyTo) : "";
    } else if (mode === "forward") {
      quotePlainRef.current = replyTo ? buildForwardedBody(replyTo) : "";
    } else {
      quotePlainRef.current = "";
    }
    setSendFromAccountId(accountId);
    setAttachments([]);
    setError(null);
  }, [open, mode, replyTo, mailboxAddress, initialTo, accountId]);

  useEffect(() => {
    if (open) setSendFromAccountId(accountId);
  }, [open, accountId]);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadingAttachment(true);
    setError(null);
    try {
      const added: ComposeAttachmentMeta[] = [];
      for (const file of Array.from(files)) {
        added.push(await uploadComposeAttachment(file));
      }
      setAttachments((prev) => [...prev, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attachment upload failed");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function applyAiDraft(result: { subject: string; html: string }) {
    if (result.subject.trim() && !subject.trim()) {
      setSubject(result.subject.trim());
    }
    const quoteHtml =
      quotePlainRef.current.trim().length > 0
        ? plainTextToComposeHtml(`\n\n${quotePlainRef.current}`)
        : "";
    const signatureHtml = mode === "new" ? getDefaultEmailSignatureHtml() : "";
    const mergedHtml = `${result.html}${signatureHtml}${quoteHtml}`;
    setBodyHtml(mergedHtml);
    setBody(stripHtmlToPlain(mergedHtml));
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await sendEmail({
        accountId: sendFromAccountId,
        to: to.split(",").map((e) => e.trim()).filter(Boolean),
        cc: cc.split(",").map((e) => e.trim()).filter(Boolean),
        subject,
        body,
        bodyHtml,
        attachments: attachments.map((a) => ({ url: a.url, name: a.name, mime: a.mime })),
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
            {accounts.length > 1 && (
              <div className="space-y-1">
                <Label>Send as</Label>
                <Select value={sendFromAccountId} onValueChange={setSendFromAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose mailbox" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label} ({a.username})
                        {a.accessKind && a.accessKind !== "owner"
                          ? ` — ${a.accessKind === "delegate" ? "delegated" : "team"}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {sendFromAccount?.accessKind && sendFromAccount.accessKind !== "owner" && (
              <p className="text-xs text-muted-foreground">
                Sending on behalf of {sendFromAccount.ownerName ?? sendFromAccount.ownerEmail ?? "mailbox owner"}.
              </p>
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
            <EmailAiWriter
              key={`ai-${open}-${initialAiPrompt}-${autoGenerateAi}`}
              defaultPrompt={initialAiPrompt}
              autoGenerate={autoGenerateAi && open}
              context={{
                composeMode: mode as MailboxComposeMode,
                to: to.trim() || initialTo?.trim() || "",
                subject,
                existingBodyPlain: stripHtmlToPlain(bodyHtml),
                threadFrom: replyTo?.fromEmail ?? replyTo?.fromName ?? undefined,
                threadSubject: replyTo?.subject ?? undefined,
                threadBodySnippet: replyTo ? emailPlainBody(replyTo).slice(0, 2500) : undefined,
              }}
              onGenerated={applyAiDraft}
            />
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
            <div className="space-y-2">
              <Label>Attachments</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void onPickFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={uploadingAttachment}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                {uploadingAttachment ? "Uploading…" : "Attach file"}
              </Button>
              {attachments.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {attachments.map((a) => (
                    <li
                      key={a.url}
                      className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
                    >
                      <span className="truncate">{a.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.url !== a.url))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">Up to 10 MB per file (PDF, Office, images, CSV, ZIP).</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={handleSend}
              disabled={
                sending ||
                uploadingAttachment ||
                !to.trim() ||
                !subject.trim() ||
                (needsSource && !sourceReady)
              }
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
