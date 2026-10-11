import { EmailFolder, Prisma } from "@prisma/client";

export type MailboxView = "inbox" | "sent" | "starred" | "spam" | "archive" | "trash";

export function parseMailboxView(raw?: string | null): MailboxView {
  const v = raw?.toLowerCase();
  if (v === "sent") return "sent";
  if (v === "starred") return "starred";
  if (v === "spam") return "spam";
  if (v === "archive") return "archive";
  if (v === "trash") return "trash";
  return "inbox";
}

export function mailboxViewWhere(
  userId: string,
  accountId: string,
  view: MailboxView,
  opts?: { unreadOnly?: boolean; search?: string }
): Prisma.EmailWhereInput {
  const base: Prisma.EmailWhereInput = {
    userId,
    emailAccountId: accountId,
  };

  let where: Prisma.EmailWhereInput;
  switch (view) {
    case "sent":
      where = { ...base, folder: EmailFolder.SENT, isDeleted: false, isSpam: false };
      break;
    case "starred":
      where = { ...base, isStarred: true, isDeleted: false, isSpam: false };
      break;
    case "spam":
      where = { ...base, isSpam: true, isDeleted: false };
      break;
    case "archive":
      where = { ...base, isArchived: true, isDeleted: false, isSpam: false };
      break;
    case "trash":
      where = { ...base, isDeleted: true };
      break;
    default:
      where = {
        ...base,
        folder: EmailFolder.INBOX,
        isDeleted: false,
        isSpam: false,
        isArchived: false,
        ...(opts?.unreadOnly ? { isRead: false } : {}),
      };
  }

  const search = opts?.search?.trim();
  if (search && search.length >= 2) {
    where = {
      AND: [
        where,
        {
          OR: [
            { subject: { contains: search, mode: "insensitive" } },
            { fromEmail: { contains: search, mode: "insensitive" } },
            { fromName: { contains: search, mode: "insensitive" } },
            { bodyText: { contains: search, mode: "insensitive" } },
          ],
        },
      ],
    };
  }

  return where;
}

export const MAILBOX_VIEW_LABELS: Record<MailboxView, string> = {
  inbox: "Inbox",
  sent: "Sent",
  starred: "Starred",
  spam: "Spam",
  archive: "Archive",
  trash: "Trash",
};
