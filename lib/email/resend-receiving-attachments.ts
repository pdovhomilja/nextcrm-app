import { getResendApiKey } from "@/lib/resend";
import { persistAttachmentBuffer } from "@/lib/email/persist-attachment";
import type { EmailStoredAttachment } from "@/lib/email/attachment-types";

type ResendAttachmentRow = {
  id: string;
  filename: string;
  size?: number;
  content_type?: string;
  download_url?: string;
};

type ListResponse = {
  data?: ResendAttachmentRow[];
};

/** Download inbound attachments from Resend and copy into CRM storage. */
export async function fetchAndPersistResendInboundAttachments(
  resendEmailId: string
): Promise<EmailStoredAttachment[]> {
  const apiKey = await getResendApiKey();
  if (!apiKey) return [];

  const listRes = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(resendEmailId)}/attachments`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!listRes.ok) {
    console.warn("[resend-inbound] attachments list failed:", listRes.status);
    return [];
  }

  const json = (await listRes.json()) as ListResponse;
  const rows = json.data ?? [];
  const stored: EmailStoredAttachment[] = [];

  for (const row of rows) {
    if (!row.download_url || !row.filename) continue;
    try {
      const fileRes = await fetch(row.download_url);
      if (!fileRes.ok) continue;
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      if (!buffer.length) continue;
      const mime = row.content_type?.trim() || "application/octet-stream";
      stored.push(await persistAttachmentBuffer(row.filename, mime, buffer));
    } catch (err) {
      console.warn("[resend-inbound] attachment persist failed:", row.filename, err);
    }
  }

  return stored;
}
