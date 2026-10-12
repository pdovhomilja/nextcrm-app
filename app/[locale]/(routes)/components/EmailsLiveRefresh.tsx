"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLiveSummary } from "@/hooks/use-live-summary";

/** When inbox unread count changes, refresh server-rendered mail views. */
export function EmailsLiveRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useLiveSummary();
  const prev = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!pathname?.includes("/emails")) return;
    const count = data?.emailUnreadCount;
    if (count === undefined) return;
    if (prev.current !== undefined && prev.current !== count) {
      router.refresh();
    }
    prev.current = count;
  }, [data?.emailUnreadCount, pathname, router]);

  return null;
}
