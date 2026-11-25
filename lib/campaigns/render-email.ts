import { prerender } from "react-dom/static";
import sanitizeHtml from "sanitize-html";

import CampaignLayout from "@/emails/CampaignLayout";

const DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

// Inline CSS: only layout and typography properties, and no value that loads
// a resource, evaluates an expression, reads a custom property or uses a CSS
// escape (which could spell any of those).
const SAFE_CSS_VALUE_PATTERNS = [/^(?![\s\S]*(?:url\(|expression\(|var\(|javascript:|\\))/i];

const ALLOWED_CSS_PROPERTIES = [
  "color", "background", "background-color",
  "text-align", "text-decoration", "text-transform", "text-indent", "vertical-align",
  "font", "font-size", "font-weight", "font-style", "font-family", "line-height",
  "letter-spacing", "white-space", "word-break", "list-style-type",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  ...["top", "right", "bottom", "left"].flatMap((side) =>
    ["color", "style", "width"].map((part) => `border-${side}-${part}`)
  ),
  "border-color", "border-style", "border-width", "border-radius",
  "border-collapse", "border-spacing", "table-layout",
  "width", "min-width", "max-width", "height", "max-height", "display",
];

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
  allowedStyles: {
    "*": Object.fromEntries(ALLOWED_CSS_PROPERTIES.map((p) => [p, SAFE_CSS_VALUE_PATTERNS])),
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
