"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Archive,
  ArchiveRestore,
  Forward,
  MailOpen,
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
import type { Mail } from "@/app/[locale]/(routes)/emails/data";
import { getEmail } from "@/actions/emails/messages";
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
import { EmailConversationBody } from "@/app/[locale]/(routes)/emails/components/EmailConversationBody";
import type { MailboxView } from "@/lib/email/mailbox-views";
import { cn } from "@/lib/utils";

interface MailDisplayProps {
  mail: Mail | null;
  activeAccountId: string | null;
  mailboxAddress?: string;
  mailboxView: MailboxView;
}

export function MailDisplay({
  mail,
  activeAccountId,
  mailboxAddress = "",
  mailboxView,
}: MailDisplayProps) {
  const router = useRouter();
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
    getEmail(mail.id)
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
      }
    : null;

  const canCompose = Boolean(composeMail?.fromEmail && mailboxView !== "trash");

  async function runAction(fn: () => Promise<void>) {
    if (!mail?.id || busy) return;
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const iconBtn = "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/40 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          {mailboxView === "trash" ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={iconBtn}
                    disabled={!mail || busy}
                    onClick={() => runAction(() => restoreEmailFromTrash(mail!.id))}
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
                    onClick={() => runAction(() => deleteEmailPermanent(mail!.id))}
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
                  onClick={() => runAction(() => moveEmailFromSpam(mail!.id))}
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
                  onClick={() => runAction(() => unarchiveEmail(mail!.id))}
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
                    onClick={() => runAction(() => archiveEmail(mail!.id))}
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
                    onClick={() => runAction(() => moveEmailToSpam(mail!.id))}
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
                  onClick={() => runAction(() => trashEmail(mail!.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Trash</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <ComposeModal
            accountId={activeAccountId ?? ""}
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
                onClick={() => runAction(() => setEmailRead(mail!.id, false))}
              >
                <MailOpen className="mr-2 h-4 w-4" />
                Mark as unread
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!mail || busy}
                onClick={() => runAction(() => setEmailRead(mail!.id, true))}
              >
                Mark as read
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {mailboxView !== "spam" && mailboxView !== "trash" && mailboxView !== "sent" && (
                <DropdownMenuItem
                  disabled={!mail || busy}
                  onClick={() => runAction(() => moveEmailToSpam(mail!.id))}
                >
                  Report spam
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mail ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border/40 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug">
                {fullEmail?.subject ?? "(no subject)"}
              </h2>
              {!mail.isRead && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Unread
                </span>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-muted/5">
            {fullEmail ? (
              <EmailConversationBody
                bodyText={fullEmail.bodyText}
                bodyHtml={fullEmail.bodyHtml}
                fromName={fullEmail.fromName}
                fromEmail={fullEmail.fromEmail}
                sentAt={fullEmail.sentAt}
                toLabel={
                  Array.isArray(fullEmail.toRecipients) && fullEmail.toRecipients.length > 0
                    ? (fullEmail.toRecipients as { name?: string; email: string }[])
                        .map((r) => r.name ?? r.email)
                        .join(", ")
                    : undefined
                }
              />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
          <MailOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">Select a message</p>
        </div>
      )}
    </div>
  );
}
