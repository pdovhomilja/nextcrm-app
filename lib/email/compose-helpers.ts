import type { EmailRecipient, Mail } from "@/app/[locale]/(routes)/emails/data";

export function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function emailPlainBody(email: {
  bodyText?: string | null;
  bodyHtml?: string | null;
}): string {
  if (email.bodyText?.trim()) return email.bodyText.trim();
  if (email.bodyHtml?.trim()) return stripHtmlToPlain(email.bodyHtml);
  return "";
}

function formatRecipientList(list?: EmailRecipient[]): string {
  return (list ?? [])
    .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
    .join(", ");
}

export function buildForwardedBody(email: Mail): string {
  const body = emailPlainBody(email);
  const sent = email.sentAt ? new Date(email.sentAt).toLocaleString() : "";
  return `\n\n---------- Forwarded message ---------\nFrom: ${email.fromName ?? email.fromEmail ?? ""}\nDate: ${sent}\nSubject: ${email.subject ?? ""}\nTo: ${formatRecipientList(email.toRecipients)}\n\n${body}`;
}

export function buildReplyAllRecipients(
  email: Mail,
  myMailboxAddress: string
): { to: string[]; cc: string[] } {
  const me = myMailboxAddress.trim().toLowerCase();
  const toSet = new Set<string>();

  const add = (addr?: string | null) => {
    const a = addr?.trim();
    if (!a) return;
    if (a.toLowerCase() === me) return;
    toSet.add(a);
  };

  add(email.fromEmail);
  for (const r of email.toRecipients ?? []) add(r.email);
  for (const r of email.ccRecipients ?? []) add(r.email);

  const cc = (email.ccRecipients ?? [])
    .map((r) => r.email?.trim())
    .filter((e): e is string => Boolean(e && e.toLowerCase() !== me));

  return { to: Array.from(toSet), cc: Array.from(new Set(cc)) };
}
