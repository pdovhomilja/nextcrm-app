import type { EmailFolder } from "@prisma/client";
import type { MailboxView } from "@/lib/email/mailbox-views";

/** List row shape for mailbox UI (matches emails/data Mail list fields). */
export type MailboxListItem = {
  id: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  sentAt: Date | null;
  isRead: boolean;
  folder: EmailFolder;
  isSpam: boolean;
  isArchived: boolean;
  isStarred: boolean;
};

export type MailboxEmailsResult = {
  emails: MailboxListItem[];
  total: number;
  page: number;
  totalPages: number;
  view: MailboxView;
};

export type MailboxCounts = {
  inboxUnread: number;
  inboxTotal: number;
  starred: number;
  spam: number;
  archive: number;
  trash: number;
};
