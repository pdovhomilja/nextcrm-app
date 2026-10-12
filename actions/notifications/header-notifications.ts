"use server";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { EmailFolder } from "@prisma/client";
import { getPendingOrderApprovals } from "@/actions/crm/orders/queries";

export type HeaderNotificationItem = {
  id: string;
  title: string;
  description: string | null;
  href: string;
  sentAt: string | null;
  kind: "email" | "approval";
};

export type HeaderNotificationsPayload = {
  totalCount: number;
  emailUnreadCount: number;
  items: HeaderNotificationItem[];
};

export async function getHeaderNotifications(): Promise<HeaderNotificationsPayload> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { totalCount: 0, emailUnreadCount: 0, items: [] };
  }

  const userId = session.user.id as string;
  const role = session.user.role;
  const isApprover = role === "admin" || role === "manager";
  const inboxWhere = {
    userId,
    folder: EmailFolder.INBOX,
    isRead: false,
    isDeleted: false,
    isSpam: false,
    isArchived: false,
  };

  const [unreadEmails, emailUnreadCount, pending] = await Promise.all([
    prismadb.email.findMany({
      where: inboxWhere,
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: {
        id: true,
        subject: true,
        fromName: true,
        fromEmail: true,
        sentAt: true,
      },
    }),
    prismadb.email.count({ where: inboxWhere }),
    isApprover
      ? getPendingOrderApprovals().catch(() => [])
      : Promise.resolve([]),
  ]);

  const items: HeaderNotificationItem[] = unreadEmails.map((email) => ({
    id: `email-${email.id}`,
    title: email.subject?.trim() || "(No subject)",
    description: email.fromName?.trim() || email.fromEmail,
    href: "/emails",
    sentAt: email.sentAt?.toISOString() ?? null,
    kind: "email" as const,
  }));

  for (const order of pending.slice(0, 5)) {
    const row = order as {
      id: string;
      accountName?: string | null;
      approvalRequestedAt?: string | Date | null;
    };
    items.push({
      id: `order-${row.id}`,
      title: "Order waiting for approval",
      description: row.accountName ?? row.id,
      href: "/crm/approvals",
      sentAt:
        row.approvalRequestedAt instanceof Date
          ? row.approvalRequestedAt.toISOString()
          : row.approvalRequestedAt ?? null,
      kind: "approval",
    });
  }

  const totalCount = emailUnreadCount + pending.length;

  return {
    totalCount,
    emailUnreadCount: emailUnreadCount,
    items: items.slice(0, 12),
  };
}
