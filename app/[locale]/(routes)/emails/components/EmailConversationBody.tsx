"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parsePlainTextThread,
  plainTextHasQuoteMarkers,
} from "@/lib/email/parse-thread";
import { stripHtmlToPlain } from "@/lib/email/compose-helpers";
import type { ParsedQuoteHeader } from "@/lib/email/parse-on-wrote-label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmailHtmlFrame } from "@/app/[locale]/(routes)/emails/components/EmailHtmlFrame";

type Props = {
  bodyText?: string | null;
  bodyHtml?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  sentAt?: Date | string | null;
  toLabel?: string;
};

type ThreadMessage = {
  id: string;
  name: string;
  email?: string;
  when: string;
  body: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatGmailWhen(sentAt: Date | string | null | undefined, fallback?: string) {
  if (sentAt) {
    const d = sentAt instanceof Date ? sentAt : new Date(sentAt);
    if (!Number.isNaN(d.getTime())) {
      return `${format(d, "EEE, MMM d, h:mm a")} (${formatDistanceToNow(d, { addSuffix: true })})`;
    }
  }
  if (fallback) return fallback;
  return "";
}

function headerToMessage(h: ParsedQuoteHeader | undefined, body: string, id: string): ThreadMessage {
  const when = h?.sentAt ? formatGmailWhen(h.sentAt) : h?.dateLabel ?? "";
  return {
    id,
    name: h?.fromName ?? "Unknown",
    email: h?.fromEmail,
    when,
    body,
  };
}

function snippet(body: string, max = 72) {
  const one = body.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  return `${one.slice(0, max)}…`;
}

function CollapsedQuoteRow({
  message,
  expanded,
  onToggle,
}: {
  message: ThreadMessage;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-border/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <Avatar className="h-8 w-8 shrink-0 border border-border/40">
          <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
            {initials(message.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
          <span className="shrink-0 text-sm font-medium text-foreground">{message.name}</span>
          <span className="truncate text-sm text-muted-foreground">{snippet(message.body)}</span>
        </div>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {message.when.split(" (")[0]}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded && (
        <div className="border-t border-border/30 bg-muted/15 px-5 py-4 pl-14 sm:pl-16">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{message.body}</p>
        </div>
      )}
    </div>
  );
}

export function EmailConversationBody({
  bodyText,
  bodyHtml,
  fromName: _fromName,
  fromEmail: _fromEmail,
  sentAt: _sentAt,
  toLabel: _toLabel,
}: Props) {
  const [expandedQuoteId, setExpandedQuoteId] = React.useState<string | null>(null);

  let plain = bodyText?.trim() ?? "";
  if (!plain && bodyHtml?.trim()) {
    plain = stripHtmlToPlain(bodyHtml);
  } else if (bodyHtml?.trim() && !plainTextHasQuoteMarkers(plain)) {
    const fromHtml = stripHtmlToPlain(bodyHtml);
    if (plainTextHasQuoteMarkers(fromHtml)) plain = fromHtml;
  }

  const parts = parsePlainTextThread(plain);
  const useThreadUi =
    parts.length > 1 || plainTextHasQuoteMarkers(plain) || parts.some((p) => p.kind !== "message");

  if (bodyHtml?.trim() && !useThreadUi) {
    return <EmailHtmlFrame bodyHtml={bodyHtml} />;
  }

  if (parts.length === 0) {
    return <p className="px-5 py-8 text-sm text-muted-foreground">(No content)</p>;
  }

  const latestBody = parts[0]?.body ?? "";
  const quotedMessages: ThreadMessage[] = parts.slice(1).map((part, i) =>
    headerToMessage(part.header, part.body, `quote-${i}`)
  );

  return (
    <div className="pb-6">
      <div className="mx-auto max-w-3xl px-5 py-5 sm:px-6">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95">{latestBody || "(No content)"}</p>
      </div>

      {quotedMessages.length > 0 && (
        <section className="border-t border-border/40 bg-muted/10">
          {quotedMessages.map((msg) => (
            <CollapsedQuoteRow
              key={msg.id}
              message={msg}
              expanded={expandedQuoteId === msg.id}
              onToggle={() => setExpandedQuoteId((id) => (id === msg.id ? null : msg.id))}
            />
          ))}
        </section>
      )}
    </div>
  );
}
