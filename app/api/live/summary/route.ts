import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { getSession } from "@/lib/auth-server";
import { getHeaderNotifications } from "@/actions/notifications/header-notifications";
import { getChatUnreadCount } from "@/actions/chat/unread";

/** Lightweight poll target for header badges (cached ~20s per user). */
export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { emailUnreadCount: 0, notificationCount: 0, chatUnreadCount: 0, items: [], at: null },
        { status: 401 }
      );
    }

    const getCached = unstable_cache(
      async () => {
        const [notifications, chatUnread] = await Promise.all([
          getHeaderNotifications(),
          getChatUnreadCount(),
        ]);
        return {
          emailUnreadCount: notifications.emailUnreadCount,
          notificationCount: notifications.totalCount,
          chatUnreadCount: chatUnread,
          items: notifications.items,
          at: new Date().toISOString(),
        };
      },
      [`live-summary-v1-${userId}`],
      { revalidate: 20, tags: [`live-summary-${userId}`] }
    );

    const body = await getCached();
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json(
      { emailUnreadCount: 0, notificationCount: 0, chatUnreadCount: 0, items: [], at: null },
      { status: 500 }
    );
  }
}
