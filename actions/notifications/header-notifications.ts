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
  const items: HeaderNotificationItem[] = [];

  const unreadEmails = await prismadb.email.findMany({
    where: {
      userId,
      folder: EmailFolder.INBOX,
      isRead: false,
      isDeleted: false,
      isSpam: false,
      isArchived: false,
    },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    take: 10,
    select: {
      id: true,
      subject: true,
      fromName: true,
      fromEmail: true,
      sentAt: true,
    },
  });

  for (const email of unreadEmails) {
    items.push({
      id: `email-${email.id}`,
      title: email.subject?.trim() || "(No subject)",
      description: email.fromName?.trim() || email.fromEmail,
      href: "/emails",
      sentAt: email.sentAt?.toISOString() ?? null,
      kind: "email",
    });
  }

  if (role === "admin" || role === "manager") {
    try {
      const pending = await getPendingOrderApprovals();
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
    } catch {
      // ignore if orders module unavailable
    }
  }

  const emailUnreadCount = await prismadb.email.count({
    where: {
      userId,
      folder: EmailFolder.INBOX,
      isRead: false,
      isDeleted: false,
      isSpam: false,
      isArchived: false,
    },
  });

  let approvalExtra = 0;
  if (role === "admin" || role === "manager") {
    try {
      const pending = await getPendingOrderApprovals();
      approvalExtra = pending.length;
    } catch {
      approvalExtra = 0;
    }
  }

  const totalCount = emailUnreadCount + approvalExtra;

  return {
    totalCount,
    emailUnreadCount: emailUnreadCount,
    items: items.slice(0, 12),
  };
}
