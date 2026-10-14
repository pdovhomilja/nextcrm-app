"use client";

import { sanitizeInboundEmailHtml } from "@/lib/email/sanitize-inbound-html";
import { cn } from "@/lib/utils";

type Props = {
  bodyHtml: string;
  className?: string;
};

/** Sanitized HTML — scrolls with the reading pane (no nested iframe). */
export function EmailHtmlBody({ bodyHtml, className }: Props) {
  const clean = sanitizeInboundEmailHtml(bodyHtml);

  return (
    <div
      className={cn("email-html-body w-full min-w-0 max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
