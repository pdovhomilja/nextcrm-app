import { prerender } from "react-dom/static";
import sanitizeHtml from "sanitize-html";

import CampaignLayout from "@/emails/CampaignLayout";

const DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

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
}: {
  contentHtml: string;
  unsubscribeUrl: string;
}): Promise<string> {
  const { prelude } = await prerender(
    CampaignLayout({
      contentHtml: sanitizeHtml(contentHtml, SANITIZE_OPTIONS),
      unsubscribeUrl,
    })
  );

  const reader = prelude.getReader();
  const decoder = new TextDecoder();
  let html = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value);
  }

  return DOCTYPE + html;
}
