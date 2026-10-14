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
  className?: string;
};

export function EmailMessageHeader({
  subject,
  fromName,
  fromEmail,
  sentAt,
  toLabel,
  isUnread,
  className,
}: Props) {
  const displayName = fromName?.trim() || fromEmail?.split("@")[0] || "Sender";
  const when = formatWhen(sentAt ?? null);

  return (
    <header className={cn("space-y-4 border-b border-border/40 px-5 py-4", className)}>
      <div className="flex flex-wrap items-start gap-2 gap-y-1">
        <h1 className="min-w-0 flex-1 text-lg font-semibold leading-snug tracking-tight sm:text-xl">
          {subject || "(no subject)"}
        </h1>
        {isUnread && (
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Unread
          </span>
        )}
      </div>
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0 border border-border/50">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
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
          {toLabel && <p className="text-xs text-muted-foreground">To {toLabel}</p>}
          {when && (
            <time className="block text-xs text-muted-foreground" dateTime={String(sentAt ?? "")}>
              {when}
            </time>
          )}
        </div>
      </div>
    </header>
  );
}
