"use client";

import { useEffect, useState } from "react";

import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  Forward,
  MailOpen,
  Sparkles,
  MoreVertical,
  Reply,
  ReplyAll,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConnectedAccount, Mail } from "@/app/[locale]/(routes)/emails/data";
import { fetchEmailDetail, invalidateEmailDetail } from "@/lib/email/client-email-cache";
import {
  archiveEmail,
  deleteEmailPermanent,
  moveEmailFromSpam,
  moveEmailToSpam,
  restoreEmailFromTrash,
  setEmailRead,
  trashEmail,
  unarchiveEmail,
} from "@/actions/emails/mailbox-actions";
import { ComposeModal } from "@/app/[locale]/(routes)/emails/components/ComposeModal";
import { EmailAttachmentsPanel } from "@/app/[locale]/(routes)/emails/components/EmailAttachmentsPanel";
import { EmailConversationBody } from "@/app/[locale]/(routes)/emails/components/EmailConversationBody";
import { parseEmailAttachments } from "@/lib/email/attachment-types";
import type { getEmail } from "@/actions/emails/messages";
import { EmailMessageHeader } from "@/app/[locale]/(routes)/emails/components/EmailMessageHeader";
import type { MailboxView } from "@/lib/email/mailbox-views";
import { cn } from "@/lib/utils";

interface MailDisplayProps {
  mail: Mail | null;
  activeAccountId: string | null;
  mailboxAddress?: string;
  accounts?: ConnectedAccount[];
  mailboxView: MailboxView;
  onBack?: () => void;
  onPatchMail?: (id: string, patch: Partial<Mail>) => void;
  onRemoveMail?: (id: string) => void;
}

export function MailDisplay({
  mail,
  activeAccountId,
  mailboxAddress = "",
  accounts = [],
  mailboxView,
  onBack,
  onPatchMail,
  onRemoveMail,
}: MailDisplayProps) {
  const [busy, setBusy] = useState(false);
  const [fetchedEmail, setFullEmail] = useState<Awaited<ReturnType<typeof getEmail>> | null>(null);
  const fullEmail = mail?.id ? fetchedEmail : null;

  useEffect(() => {
    if (!mail?.id) {
      setFullEmail(null);
      return;
    }
    setFullEmail(null);
    let cancelled = false;
    fetchEmailDetail(mail.id)
      .then((data) => {
        if (!cancelled) setFullEmail(data);
      })
      .catch(() => {
        if (!cancelled) setFullEmail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mail?.id]);

  const bodyLoading = Boolean(
    mail?.id && fullEmail && !fullEmail.bodyText && !fullEmail.bodyHtml
  );

  useEffect(() => {
    if (!mail?.id || !bodyLoading) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      invalidateEmailDetail(mail.id);
      fetchEmailDetail(mail.id)
        .then((data) => {
          if (data) setFullEmail(data);
        })
        .catch(() => {});
      if (tries >= 24) window.clearInterval(timer);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [mail?.id, bodyLoading]);

  const composeMail: Mail | null = fullEmail
    ? {
        id: fullEmail.id,
        subject: fullEmail.subject,
        fromName: fullEmail.fromName,
        fromEmail: fullEmail.fromEmail,
        sentAt: fullEmail.sentAt,
        isRead: fullEmail.isRead,
        folder: fullEmail.folder,
        rfcMessageId: fullEmail.rfcMessageId,
        toRecipients: fullEmail.toRecipients as Mail["toRecipients"],
        ccRecipients: fullEmail.ccRecipients as Mail["ccRecipients"],
        bodyText: fullEmail.bodyText,
        bodyHtml: fullEmail.bodyHtml,
        attachments: parseEmailAttachments(fullEmail.attachments),
      }
    : null;

  const attachmentList = fullEmail ? parseEmailAttachments(fullEmail.attachments) : [];

  const canCompose = Boolean(composeMail?.fromEmail && mailboxView !== "trash");

  async function runAction(
    fn: () => Promise<void>,
    after?: { patch?: Partial<Mail>; remove?: boolean }
  ) {
    if (!mail?.id || busy) return;
    setBusy(true);
    const id = mail.id;
    try {
      if (after?.patch) onPatchMail?.(id, after.patch);
      if (after?.remove) onRemoveMail?.(id);
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const iconBtn = "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground";

  const toLabel =
    fullEmail &&
    Array.isArray(fullEmail.toRecipients) &&
    fullEmail.toRecipients.length > 0
      ? (fullEmail.toRecipients as { name?: string; email: string }[])
          .map((r) => r.name ?? r.email)
          .join(", ")
      : undefined;

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border/40 bg-background px-2 py-2 sm:px-3">
        <div className="flex min-w-0 shrink items-center gap-0.5">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mr-1 h-8 gap-1 px-2 text-xs lg:hidden"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
              Inbox
            </Button>
          )}
          {mailboxView === "trash" ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={iconBtn}
                    disabled={!mail || busy}
                    onClick={() =>
                      runAction(() => restoreEmailFromTrash(mail!.id), {
                        remove: mailboxView === "trash",
                      })
                    }
                  >
                    <ArchiveRestore className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restore</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(iconBtn, "hover:text-destructive")}
                    disabled={!mail || busy}
                    onClick={() =>
                      runAction(() => deleteEmailPermanent(mail!.id), { remove: true })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete forever</TooltipContent>
              </Tooltip>
            </>
          ) : mailboxView === "spam" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconBtn}
                  disabled={!mail || busy}
                  onClick={() =>
                    runAction(() => moveEmailFromSpam(mail!.id), {
                      remove: mailboxView === "spam",
                    })
                  }
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Not spam</TooltipContent>
            </Tooltip>
          ) : mailboxView === "archive" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconBtn}
                  disabled={!mail || busy}
                  onClick={() =>
                    runAction(() => unarchiveEmail(mail!.id), {
                      remove: mailboxView === "archive",
                    })
                  }
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move to inbox</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={iconBtn}
                    disabled={!mail || busy || mailboxView === "sent"}
                    onClick={() =>
                      runAction(() => archiveEmail(mail!.id), {
                        remove: ["inbox", "sent", "starred", "spam"].includes(mailboxView),
                      })
                    }
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Archive</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={iconBtn}
                    disabled={!mail || busy || mailboxView === "sent"}
                    onClick={() =>
                      runAction(() => moveEmailToSpam(mail!.id), { remove: true })
                    }
                  >
                    <ShieldAlert className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Report spam</TooltipContent>
              </Tooltip>
            </>
          )}
          {mailboxView !== "trash" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(iconBtn, "hover:text-destructive")}
                  disabled={!mail || busy}
                  onClick={() =>
                    runAction(() => trashEmail(mail!.id), { remove: true })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Trash</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <ComposeModal
                  accountId={activeAccountId ?? ""}
                  accounts={accounts}
                  mailboxAddress={mailboxAddress}
                  mode="reply"
                  replyTo={composeMail}
                  initialAiPrompt="Write a professional reply that addresses their message clearly and politely."
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className={iconBtn}
                      disabled={!mail || !canCompose}
                      aria-label="Reply with AI"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  }
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>Reply with AI</TooltipContent>
          </Tooltip>
          <ComposeModal
            accountId={activeAccountId ?? ""}
            accounts={accounts}
            mailboxAddress={mailboxAddress}
            mode="reply"
            replyTo={composeMail}
            trigger={
              <Button variant="ghost" size="icon" className={iconBtn} disabled={!mail || !canCompose}>
                <Reply className="h-4 w-4" />
              </Button>
            }
          />
          <ComposeModal
            accountId={activeAccountId ?? ""}
            accounts={accounts}
            mailboxAddress={mailboxAddress}
            mode="reply-all"
            replyTo={composeMail}
            trigger={
              <Button variant="ghost" size="icon" className={iconBtn} disabled={!mail || !canCompose}>
                <ReplyAll className="h-4 w-4" />
              </Button>
            }
          />
          <ComposeModal
            accountId={activeAccountId ?? ""}
            accounts={accounts}
            mailboxAddress={mailboxAddress}
            mode="forward"
            replyTo={composeMail}
            trigger={
              <Button variant="ghost" size="icon" className={iconBtn} disabled={!mail || !canCompose}>
                <Forward className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={iconBtn} disabled={!mail}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!mail || busy}
                onClick={() =>
                  runAction(() => setEmailRead(mail!.id, false), { patch: { isRead: false } })
                }
              >
                <MailOpen className="mr-2 h-4 w-4" />
                Mark as unread
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!mail || busy}
                onClick={() =>
                  runAction(() => setEmailRead(mail!.id, true), { patch: { isRead: true } })
                }
              >
                Mark as read
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {mailboxView !== "spam" && mailboxView !== "trash" && mailboxView !== "sent" && (
                <DropdownMenuItem
                  disabled={!mail || busy}
                  onClick={() =>
                    runAction(() => moveEmailToSpam(mail!.id), { remove: true })
                  }
                >
                  Report spam
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mail ? (
        <div className="flex min-h-0 flex-col overflow-hidden">
          {fullEmail ? (
            <>
              <EmailMessageHeader
                subject={fullEmail.subject ?? "(no subject)"}
                fromName={fullEmail.fromName}
                fromEmail={fullEmail.fromEmail}
                sentAt={fullEmail.sentAt}
                toLabel={toLabel}
                isUnread={!mail.isRead}
                attachmentCount={attachmentList.length}
                className="shrink-0"
              />
              <div className="relative isolate min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain bg-muted/30 dark:bg-muted/15">
                {bodyLoading && (
                  <p className="px-5 py-3 text-sm text-muted-foreground">Loading message body…</p>
                )}
                <EmailConversationBody
                  bodyText={fullEmail.bodyText}
                  bodyHtml={fullEmail.bodyHtml}
                  fromName={fullEmail.fromName}
                  fromEmail={fullEmail.fromEmail}
                  sentAt={fullEmail.sentAt}
                  toLabel={toLabel}
                />
                {attachmentList.length > 0 && (
                  <div className="relative mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
                    <EmailAttachmentsPanel
                      emailId={fullEmail.id}
                      attachments={attachmentList}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-col overflow-hidden">
              <div className="animate-pulse space-y-3 border-b border-border/40 px-5 py-4">
                <div className="h-6 w-3/4 max-w-md rounded-md bg-muted" />
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-muted" />
                    <div className="h-3 w-32 rounded bg-muted" />
                  </div>
                </div>
              </div>
              <p className="p-5 text-sm text-muted-foreground">Loading message…</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
          <MailOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">Select a message</p>
        </div>
      )}
    </div>
  );
}
