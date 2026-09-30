import sanitizeHtml from "sanitize-html";

import { renderCampaignShell } from "@/lib/campaigns/email-shell";

// content_html is client-supplied — allow only what the TipTap editor and
// AI-generated email markup legitimately produce.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "strike", "code", "pre",
    "ul", "ol", "li", "blockquote", "hr", "br", "a", "img",
    "div", "span", "table", "thead", "tbody", "tr", "td", "th",
  ],
  allowedAttributes: {
    "*": ["style", "align", "width", "height"],
    a: ["href", "target", "rel", "style"],
    img: ["src", "alt", "width", "height", "style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export async function renderCampaignEmail({
  contentHtml,
  unsubscribeUrl,
  ctaLabel,
  ctaUrl,
}: {
  contentHtml: string;
  unsubscribeUrl: string;
  /** Optional per-template CTA button label. */
  ctaLabel?: string | null;
  /** Optional per-template CTA button URL (scheme-checked in the shell). */
  ctaUrl?: string | null;
}): Promise<string> {
  return renderCampaignShell({
    body: sanitizeHtml(contentHtml, SANITIZE_OPTIONS),
    unsubscribeUrl,
    ctaLabel: ctaLabel ?? undefined,
    ctaUrl: ctaUrl ?? undefined,
  });
}
