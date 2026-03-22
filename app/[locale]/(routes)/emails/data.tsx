// Type definitions for the emails feature — mock data removed

export type EmailRecipient = { name?: string; email: string };

/** Shape returned by getEmails() — matches the Prisma select in actions/emails/messages.ts */
export type Mail = {
  id: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  sentAt: Date | null;
  isRead: boolean;
  folder: "INBOX" | "SENT";
};

export type ConnectedAccount = {
  id: string;
  label: string;
  username: string;
};
