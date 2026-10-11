"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const senderName = fullEmail?.fromName ?? fullEmail?.fromEmail ?? "?";
  const senderInitials = senderName
    .split(" ")
    .map((c) => c[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
          <div className="flex items-start gap-3 px-4 py-4">
            <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
              <AvatarImage alt={senderName} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {senderInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="font-semibold leading-tight">
                  {fullEmail?.fromName ?? fullEmail?.fromEmail ?? "(unknown)"}
                </p>
                {!mail.isRead && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Unread
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/90">{fullEmail?.subject ?? "(no subject)"}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">From</span> {fullEmail?.fromEmail ?? ""}
              </p>
              {Array.isArray(fullEmail?.toRecipients) && fullEmail.toRecipients.length > 0 && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground/70">To</span>{" "}
                  {(fullEmail.toRecipients as { name?: string; email: string }[])
                    .map((r) => r.name ?? r.email)
                    .join(", ")}
                </p>
              )}
            </div>
            {fullEmail?.sentAt && (
              <time className="shrink-0 text-[11px] text-muted-foreground">
                {format(new Date(fullEmail.sentAt), "PPp")}
              </time>
            )}
          </div>
          <Separator className="opacity-40" />
          <div className="min-h-0 flex-1 overflow-auto bg-gradient-to-b from-muted/15 to-background">
            {fullEmail?.bodyHtml ? (
              <iframe
                srcDoc={fullEmail.bodyHtml}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                className="min-h-[280px] w-full border-0 bg-background"
                style={{ height: "100%", minHeight: "280px" }}
                title="Email body"
              />
            ) : (
              <pre className="whitespace-pre-wrap p-4 text-sm font-sans leading-relaxed">
                {fullEmail?.bodyText ?? (fullEmail ? "(No content)" : "Loading…")}
              </pre>
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
