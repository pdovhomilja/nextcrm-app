// Type definitions for the emails feature — mock data removed

export type EmailRecipient = { name?: string; email: string };

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
};

export type ConnectedAccount = {
  id: string;
  label: string;
  username: string;
};
