export type EmailStoredAttachment = {
  url: string;
  name: string;
  mime: string;
  size?: number;
};

export function parseEmailAttachments(raw: unknown): EmailStoredAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: EmailStoredAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const mime = typeof o.mime === "string" ? o.mime.trim() : "application/octet-stream";
    if (!url || !name) continue;
    out.push({
      url,
      name,
      mime,
      size: typeof o.size === "number" ? o.size : undefined,
    });
  }
  return out;
}

export function isPdfAttachment(a: EmailStoredAttachment): boolean {
  return (
    a.mime === "application/pdf" ||
    a.name.toLowerCase().endsWith(".pdf")
  );
}
