"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { parsePlainTextThread } from "@/lib/email/parse-thread";
import { stripHtmlToPlain } from "@/lib/email/compose-helpers";
import type { ParsedQuoteHeader } from "@/lib/email/parse-on-wrote-label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type Props = {
  bodyText?: string | null;
  bodyHtml?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  sentAt?: Date | string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatWhen(sentAt: Date | string | null | undefined, fallback?: string) {
  if (sentAt) {
    const d = sentAt instanceof Date ? sentAt : new Date(sentAt);
    if (!Number.isNaN(d.getTime())) return format(d, "MMM d, yyyy, h:mm a");
  }
  return fallback ?? "";
}

function MessageBubble({
  name,
  email,
  when,
  body,
  compact,
}: {
  name: string;
  email?: string;
  when?: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border/50 bg-card shadow-sm",
        compact ? "px-3 py-2.5" : "px-4 py-3"
      )}
    >
      <header className="mb-2 flex items-start gap-3">
        <Avatar className={cn("border border-border/40", compact ? "h-8 w-8" : "h-9 w-9")}>
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-semibold text-foreground">{name}</span>
            {email && (
              <span className="truncate text-xs text-muted-foreground">&lt;{email}&gt;</span>
            )}
          </div>
          {when && (
            <time className="text-[11px] text-muted-foreground">{when}</time>
          )}
        </div>
      </header>
      <div className="whitespace-pre-wrap pl-0 text-sm leading-relaxed text-foreground/90 sm:pl-12">
        {body}
      </div>
    </article>
  );
}

function metaFromHeader(h?: ParsedQuoteHeader) {
  if (!h) return { name: "Unknown", email: undefined, when: undefined };
  return {
    name: h.fromName,
    email: h.fromEmail,
    when: formatWhen(h.sentAt, h.dateLabel),
  };
}

export function EmailConversationBody({
  bodyText,
  bodyHtml,
  fromName,
  fromEmail,
  sentAt,
}: Props) {
  const [showEarlier, setShowEarlier] = React.useState(false);

  const plain =
    bodyText?.trim() ||
    (bodyHtml?.trim() ? stripHtmlToPlain(bodyHtml) : "");

  const parts = parsePlainTextThread(plain);
  const hasThread = parts.length > 1 || parts.some((p) => p.kind !== "message");

  if (bodyHtml?.trim() && !hasThread) {
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

  const latest = parts[0];
  const earlier = parts.slice(1);
  const latestName = fromName?.trim() || fromEmail?.split("@")[0] || "You";
  const latestWhen = formatWhen(sentAt ?? null);

  return (
    <div className="space-y-3 p-4">
      <MessageBubble
        name={latestName}
        email={fromEmail ?? undefined}
        when={latestWhen}
        body={latest.body}
      />

      {earlier.length > 0 && (
        <>
          {!showEarlier ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mx-auto flex w-full max-w-md items-center justify-center gap-1 rounded-full border border-dashed border-border/70 bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50"
              onClick={() => setShowEarlier(true)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Show {earlier.length} earlier {earlier.length === 1 ? "message" : "messages"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mx-auto flex items-center gap-1 text-xs text-muted-foreground"
                onClick={() => setShowEarlier(false)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Hide earlier messages
              </Button>
              <div className="relative space-y-3 pl-2 before:absolute before:bottom-2 before:left-[1.15rem] before:top-2 before:w-px before:bg-border/60">
                {earlier.map((part, i) => {
                  const meta = metaFromHeader(part.header);
                  return (
                    <div key={`${part.kind}-${i}`} className="relative pl-8">
                      <span className="absolute left-[0.65rem] top-4 h-2 w-2 rounded-full border-2 border-background bg-muted-foreground/40" />
                      <MessageBubble
                        compact
                        name={meta.name}
                        email={meta.email}
                        when={meta.when}
                        body={part.body}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
