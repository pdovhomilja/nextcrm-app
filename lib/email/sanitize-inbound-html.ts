import sanitizeHtml from "sanitize-html";

function cleanStyleString(style: string): string {
  return style
    .replace(/position\s*:\s*fixed/gi, "position: relative")
    .replace(/(-webkit-)?backdrop-filter\s*:[^;]+;?/gi, "")
    .replace(/filter\s*:[^;]*blur\([^)]*\)[^;]*;?/gi, "")
    .replace(/inset\s*:[^;]+;?/gi, "");
}

function cleanStyleBlocks(html: string): string {
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    const cleanedCss = css
      .replace(/position\s*:\s*fixed/gi, "position: relative")
      .replace(/(-webkit-)?backdrop-filter\s*:[^;}]+;?/gi, "")
      .replace(/filter\s*:[^;}*]*blur\([^)]*\)[^;}*]*;?/gi, "")
      .replace(/inset\s*:[^;}]+;?/gi, "");
    return `<style>${cleanedCss}</style>`;
  });
}

/** Inbound MIME HTML — allow typical marketing/newsletter markup safely. */
export const INBOUND_EMAIL_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "html",
    "head",
    "body",
    "meta",
    "title",
    "style",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "blockquote",
    "hr",
    "br",
    "a",
    "img",
    "div",
    "span",
    "center",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "td",
    "th",
    "caption",
    "colgroup",
    "col",
    "font",
  ],
  allowedAttributes: {
    "*": ["style", "class", "id", "align", "width", "height", "valign", "bgcolor", "role"],
    a: ["href", "target", "rel", "style", "name"],
    img: ["src", "alt", "width", "height", "style"],
    table: ["border", "cellpadding", "cellspacing", "width", "style", "role"],
    td: ["colspan", "rowspan", "width", "style", "align", "valign"],
    th: ["colspan", "rowspan", "width", "style", "align", "valign"],
    col: ["span", "width", "style"],
    colgroup: ["span", "width", "style"],
  },
  transformTags: {
    "*": (tagName, attribs) => {
      if (attribs.style) {
        attribs.style = cleanStyleString(attribs.style);
      }
      return { tagName, attribs };
    },
    a: (tagName, attribs) => {
      attribs.target = "_blank";
      attribs.rel = "noopener noreferrer";
      if (attribs.style) {
        attribs.style = cleanStyleString(attribs.style);
      }
      return { tagName, attribs };
    },
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  allowVulnerableTags: true,
};

export function sanitizeInboundEmailHtml(html: string): string {
  if (!html) return "";
  const cleanedInput = cleanStyleBlocks(html);
  return sanitizeHtml(cleanedInput, INBOUND_EMAIL_SANITIZE);
}

