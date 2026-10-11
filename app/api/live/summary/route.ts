import { NextResponse } from "next/server";
import { getHeaderNotifications } from "@/actions/notifications/header-notifications";
import { getChatUnreadCount } from "@/actions/chat/unread";

/** Lightweight poll target for header badges (Vercel-friendly vs WebSockets). */
export async function GET() {
  try {
    const [notifications, chatUnread] = await Promise.all([
      getHeaderNotifications(),
      getChatUnreadCount(),
    ]);
    return NextResponse.json({
      emailUnreadCount: notifications.emailUnreadCount,
      notificationCount: notifications.totalCount,
      chatUnreadCount: chatUnread,
      items: notifications.items,
      at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { emailUnreadCount: 0, notificationCount: 0, chatUnreadCount: 0, items: [], at: null },
      { status: 401 }
    );
  }
}
