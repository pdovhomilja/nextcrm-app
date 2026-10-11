import { EmailFolder, EmailSendProvider } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getResendApiKey } from "@/lib/resend";
import { inngest } from "@/inngest/client";

export type ResendReceivedEmail = {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  created_at?: string;
  message_id?: string | null;
  received_for?: string[];
};

export function normalizeEmailAddress(raw: string): string {
  const trimmed = raw.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  return (angle?.[1] ?? trimmed).toLowerCase();
}

export function parseFromField(from: string): { fromName: string | null; fromEmail: string | null } {
  const trimmed = from.trim();
  const angle = trimmed.match(/^(.*?)<\s*([^>]+)\s*>$/);
  if (angle) {
    const name = angle[1].replace(/^["']|["']$/g, "").trim();
    return { fromName: name || null, fromEmail: angle[2].trim() };
  }
  if (trimmed.includes("@")) {
    return { fromName: null, fromEmail: trimmed };
  }
  return { fromName: trimmed || null, fromEmail: null };
}

export function toRecipientJson(addresses: string[] | undefined) {
  return (addresses ?? []).map((addr) => {
    const email = normalizeEmailAddress(addr);
    const parsed = parseFromField(addr);
    return { email: parsed.fromEmail ?? email, name: parsed.fromName ?? undefined };
  });
}

export async function fetchResendReceivedEmail(emailId: string): Promise<ResendReceivedEmail> {
  const apiKey = await getResendApiKey();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it in Vercel Environment Variables or .env.local."
    );
  }
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend receiving API ${res.status}: ${detail}`);
  }
  return (await res.json()) as ResendReceivedEmail;
}

/** All addresses this inbound message was delivered to (Resend To + received_for). */
export function collectInboundRecipientAddresses(
  payload: ResendReceivedEmail,
  webhookMeta?: { to?: string[]; received_for?: string[] }
): string[] {
  const set = new Set<string>();
  for (const list of [
    payload.received_for,
    webhookMeta?.received_for,
    payload.to,
    webhookMeta?.to,
  ]) {
    for (const addr of list ?? []) {
      set.add(normalizeEmailAddress(addr));
    }
  }
  return Array.from(set);
}

type ResendMailboxMatch = {
  id: string;
  userId: string;
  username: string;
  matchedAddress: string;
};

/**
 * Map inbound recipients to CRM mailboxes. Each employee mailbox uses
 * EmailAccount.username = work email (e.g. dhoni@vensailabs.in).
 */
export async function findResendMailboxesForRecipients(
  recipientAddresses: string[]
): Promise<ResendMailboxMatch[]> {
  if (recipientAddresses.length === 0) return [];

  const wanted = new Set(recipientAddresses);
  const accounts = await prismadb.emailAccount.findMany({
    where: {
      sendProvider: EmailSendProvider.RESEND,
      isActive: true,
    },
    select: {
      id: true,
      userId: true,
      username: true,
      user: { select: { workEmail: true } },
    },
  });

  const matches: ResendMailboxMatch[] = [];
  const seenAccountIds = new Set<string>();

  for (const account of accounts) {
    const mailboxAddresses = [
      normalizeEmailAddress(account.username),
      account.user.workEmail ? normalizeEmailAddress(account.user.workEmail) : null,
    ].filter(Boolean) as string[];

    for (const addr of mailboxAddresses) {
      if (wanted.has(addr) && !seenAccountIds.has(account.id)) {
        seenAccountIds.add(account.id);
        matches.push({
          id: account.id,
          userId: account.userId,
          username: account.username,
          matchedAddress: addr,
        });
        break;
      }
    }
  }

  return matches;
}

async function storeInboundForMailbox(
  payload: ResendReceivedEmail,
  account: ResendMailboxMatch
): Promise<{ stored: boolean; emailId?: string; reason?: string }> {
  const rfcMessageId = (
    payload.message_id?.trim() || `resend-inbound-${payload.id}`
  ).replace(/^<|>$/g, "");
  const { fromName, fromEmail } = parseFromField(payload.from);
  const sentAt = payload.created_at ? new Date(payload.created_at) : new Date();

  const existing = await prismadb.email.findUnique({
    where: {
      emailAccountId_rfcMessageId: {
        emailAccountId: account.id,
        rfcMessageId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prismadb.emailAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });
    return { stored: false, reason: "duplicate", emailId: existing.id };
  }

  const created = await prismadb.email.create({
    data: {
      emailAccountId: account.id,
      userId: account.userId,
      rfcMessageId,
      folder: EmailFolder.INBOX,
      subject: payload.subject ?? null,
      fromName,
      fromEmail,
      toRecipients: toRecipientJson(payload.to),
      ccRecipients: toRecipientJson(payload.cc),
      bccRecipients: toRecipientJson(payload.bcc),
      bodyText: payload.text ?? null,
      bodyHtml: payload.html ?? null,
      sentAt,
      isRead: false,
    },
    select: { id: true },
  });

  await prismadb.emailAccount.update({
    where: { id: account.id },
    data: { lastSyncedAt: new Date() },
  });

  await inngest.send({ name: "email/link-crm", data: { emailId: created.id } });

  return { stored: true, emailId: created.id };
}

/** Ingest one Resend inbound message into every matching employee inbox. */
export async function ingestResendInboundEmail(
  resendEmailId: string,
  webhookMeta?: { to?: string[]; received_for?: string[] }
) {
  const payload = await fetchResendReceivedEmail(resendEmailId);
  const recipients = collectInboundRecipientAddresses(payload, webhookMeta);
  const mailboxes = await findResendMailboxesForRecipients(recipients);

  if (mailboxes.length === 0) {
    console.warn("[resend-inbound] No mailbox for recipients:", recipients);
    return {
      stored: false,
      reason: "no_matching_mailbox" as const,
      recipients,
    };
  }

  const results: Array<{
    accountId: string;
    mailbox: string;
    stored: boolean;
    emailId?: string;
  }> = [];

  for (const mailbox of mailboxes) {
    const result = await storeInboundForMailbox(payload, mailbox);
    results.push({
      accountId: mailbox.id,
      mailbox: mailbox.matchedAddress,
      stored: result.stored,
      emailId: result.emailId,
    });
  }

  return {
    stored: results.some((r) => r.stored),
    mailboxes: results,
    recipients,
  };
}

export function getResendInboundWebhookUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/webhooks/resend/inbound`;
}
