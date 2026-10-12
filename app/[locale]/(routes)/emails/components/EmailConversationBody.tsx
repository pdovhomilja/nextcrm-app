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
  const when = h?.sentAt
    ? formatGmailWhen(h.sentAt)
    : h?.dateLabel ?? "";
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

function GmailMessageHeader({
  name,
  email,
  when,
  toLabel,
  size = "default",
}: {
  name: string;
  email?: string;
  when: string;
  toLabel?: string;
  size?: "default" | "sm";
}) {
  return (
    <div className="flex items-start gap-3">
      <Avatar
        className={cn(
          "shrink-0 border border-border/50",
          size === "sm" ? "h-8 w-8" : "h-10 w-10"
        )}
      >
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className={cn("font-semibold text-foreground", size === "sm" ? "text-sm" : "text-[15px]")}>
                {name}
              </span>
              {email && (
                <span className="max-w-[200px] truncate text-xs text-muted-foreground sm:max-w-none">
                  &lt;{email}&gt;
                </span>
              )}
            </div>
            {toLabel && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                to {toLabel}
              </p>
            )}
          </div>
          {when && (
            <time className="shrink-0 whitespace-nowrap text-[11px] leading-tight text-muted-foreground sm:text-xs">
              {when}
            </time>
          )}
        </div>
      </div>
    </div>
  );
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
    <div className="border-t border-border/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <Avatar className="h-8 w-8 shrink-0 border border-border/40">
          <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
            {initials(message.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 flex items-baseline gap-2 overflow-hidden">
          <span className="shrink-0 text-sm font-medium text-foreground">{message.name}</span>
          <span className="truncate text-sm text-muted-foreground">{snippet(message.body)}</span>
        </div>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{message.when.split(" (")[0]}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded && (
        <div className="border-t border-border/30 bg-muted/20 px-4 py-3 pl-[3.25rem]">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{message.body}</p>
        </div>
      )}
    </div>
  );
}

export function EmailConversationBody({
  bodyText,
  bodyHtml,
  fromName,
  fromEmail,
  sentAt,
  toLabel,
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
    const IFRAME_STYLES = `
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 16px; margin: 0; line-height: 1.55; color: #18181b; font-size: 14px; }
      blockquote { margin: 14px 0; padding: 12px 14px; border-left: 3px solid #0ea5e9; background: #f4f4f5; border-radius: 0 10px 10px 0; }
    `;
    const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${IFRAME_STYLES}</style></head><body>${bodyHtml}</body></html>`;
    return (
      <iframe
        srcDoc={srcDoc}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        className="min-h-[280px] w-full border-0 bg-background"
        style={{ height: "100%", minHeight: "280px" }}
        title="Email body"
      />
    );
  }

  if (parts.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">(No content)</p>;
  }

  const latestBody = parts[0]?.body ?? "";
  const latestName = fromName?.trim() || fromEmail?.split("@")[0] || "Sender";
  const latestWhen = formatGmailWhen(sentAt ?? null);

  const quotedMessages: ThreadMessage[] = parts.slice(1).map((part, i) =>
    headerToMessage(part.header, part.body, `quote-${i}`)
  );

  return (
    <div className="divide-y divide-border/50">
      <section className="px-4 py-4">
        <GmailMessageHeader
          name={latestName}
          email={fromEmail ?? undefined}
          when={latestWhen}
          toLabel={toLabel}
        />
        <div className="mt-4 whitespace-pre-wrap pl-0 text-sm leading-relaxed text-foreground sm:pl-[3.25rem]">
          {latestBody || "(No content)"}
        </div>
      </section>

      {quotedMessages.length > 0 && (
        <section className="rounded-b-lg bg-muted/10">
          {quotedMessages.map((msg) => (
            <CollapsedQuoteRow
              key={msg.id}
              message={msg}
              expanded={expandedQuoteId === msg.id}
              onToggle={() =>
                setExpandedQuoteId((id) => (id === msg.id ? null : msg.id))
              }
            />
          ))}
        </section>
      )}
    </div>
  );
}
