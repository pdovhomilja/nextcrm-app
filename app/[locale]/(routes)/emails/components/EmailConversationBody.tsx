"use client";

import { cn } from "@/lib/utils";
import { parsePlainTextThread } from "@/lib/email/parse-thread";
import { stripHtmlToPlain } from "@/lib/email/compose-helpers";

type Props = {
  bodyText?: string | null;
  bodyHtml?: string | null;
};

const IFRAME_STYLES = `
  body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 16px; margin: 0; line-height: 1.55; color: #18181b; font-size: 14px; }
  blockquote { margin: 14px 0; padding: 12px 14px; border-left: 3px solid #0ea5e9; background: #f4f4f5; border-radius: 0 10px 10px 0; color: #3f3f46; }
  blockquote blockquote { background: #e4e4e7; border-left-color: #94a3b8; }
  .gmail_quote { margin: 14px 0; padding-left: 12px; border-left: 3px solid #0ea5e9; }
`;

export function EmailConversationBody({ bodyText, bodyHtml }: Props) {
  const plain =
    bodyText?.trim() ||
    (bodyHtml?.trim() ? stripHtmlToPlain(bodyHtml) : "");

  const parts = parsePlainTextThread(plain);

  const hasThread = parts.length > 1 || parts.some((p) => p.kind !== "message");

  if (bodyHtml?.trim() && !hasThread) {
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

  return (
    <div className="space-y-3 p-4">
      {parts.map((part, i) => (
        <article
          key={`${part.kind}-${i}-${part.depth}`}
          className={cn(
            "rounded-xl border text-sm leading-relaxed",
            part.kind === "message"
              ? "border-border/60 bg-card px-4 py-3 shadow-sm"
              : "border-border/40 bg-muted/40 px-4 py-3",
          )}
          style={{ marginLeft: part.depth > 0 ? `${Math.min(part.depth, 4) * 14}px` : undefined }}
        >
          {part.kind !== "message" && part.label && (
            <header className="mb-2 flex flex-wrap items-center gap-2 border-b border-border/30 pb-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  part.kind === "forward"
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                    : "bg-primary/10 text-primary"
                )}
              >
                {part.kind === "forward" ? "Forwarded" : "Earlier message"}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-2">{part.label}</span>
            </header>
          )}
          <div className="whitespace-pre-wrap font-sans text-foreground/90">{part.body}</div>
        </article>
      ))}
    </div>
  );
}
