"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatWhen(sentAt: Date | string | null | undefined) {
  if (!sentAt) return "";
  const d = sentAt instanceof Date ? sentAt : new Date(sentAt);
  if (Number.isNaN(d.getTime())) return "";
  return `${format(d, "EEE, MMM d, yyyy · h:mm a")} (${formatDistanceToNow(d, { addSuffix: true })})`;
}

type Props = {
  subject: string;
  fromName?: string | null;
  fromEmail?: string | null;
  sentAt?: Date | string | null;
  toLabel?: string;
  isUnread?: boolean;
  attachmentCount?: number;
  className?: string;
};

export function EmailMessageHeader({
  subject,
  fromName,
  fromEmail,
  sentAt,
  toLabel,
  isUnread,
  attachmentCount = 0,
  className,
}: Props) {
  const displayName = fromName?.trim() || fromEmail?.split("@")[0] || "Sender";
  const when = formatWhen(sentAt ?? null);

  return (
    <header
      className={cn(
        "relative shrink-0 overflow-hidden border-b border-border/40 bg-background/95 backdrop-blur-md",
        className
      )}
    >
      <div
        className="h-1 w-full bg-gradient-to-r from-primary via-violet-500 to-primary/40"
        aria-hidden
      />
      <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-start gap-2 gap-y-2">
          <h1 className="min-w-0 flex-1 text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-[1.35rem]">
            {subject || "(no subject)"}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {attachmentCount > 0 && (
              <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {attachmentCount} file{attachmentCount === 1 ? "" : "s"}
              </span>
            )}
            {isUnread && (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Unread
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3.5">
          <Avatar className="h-11 w-11 shrink-0 border-2 border-background shadow-md ring-2 ring-primary/15">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20 text-xs font-bold text-primary">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-semibold text-foreground">{displayName}</span>
              {fromEmail && (
                <span className="truncate text-sm text-muted-foreground">&lt;{fromEmail}&gt;</span>
              )}
            </div>
            {toLabel && (
              <p className="text-xs text-muted-foreground">
                To <span className="text-foreground/80">{toLabel}</span>
              </p>
            )}
            {when && (
              <time className="block text-xs text-muted-foreground" dateTime={String(sentAt ?? "")}>
                {when}
              </time>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
