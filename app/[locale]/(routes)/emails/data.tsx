// Type definitions for the emails feature — mock data removed

import type { EmailStoredAttachment } from "@/lib/email/attachment-types";

export type EmailRecipient = { name?: string; email: string };
export type { EmailStoredAttachment };

/** Core shape returned by getEmails() list view. Detail fields are optional — populated by getEmail(). */
export type Mail = {
  id: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  sentAt: Date | null;
  isRead: boolean;
  folder: "INBOX" | "SENT";
  // Detail fields — present only when fetched via getEmail()
  rfcMessageId?: string;
  toRecipients?: EmailRecipient[];
  ccRecipients?: EmailRecipient[];
  bodyText?: string | null;
  bodyHtml?: string | null;
  attachments?: EmailStoredAttachment[];
  isStarred?: boolean;
};

export type ConnectedAccount = {
  id: string;
  label: string;
  username: string;
  accessKind?: "owner" | "delegate" | "admin";
  ownerName?: string | null;
  ownerEmail?: string | null;
};
