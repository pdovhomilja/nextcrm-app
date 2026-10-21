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

export function formatAttachmentSize(bytes?: number): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentKindLabel(a: EmailStoredAttachment): string {
  if (isPdfAttachment(a)) return "PDF";
  const ext = a.name.includes(".") ? a.name.split(".").pop()?.toUpperCase() : "";
  if (ext) return ext.slice(0, 8);
  if (a.mime.startsWith("image/")) return "Image";
  return "File";
}
