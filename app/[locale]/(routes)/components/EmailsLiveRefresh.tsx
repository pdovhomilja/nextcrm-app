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
      const timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, 4000);
      prev.current = count;
      return () => window.clearTimeout(timer);
    }
    prev.current = count;
  }, [data?.emailUnreadCount, pathname, router]);

  return null;
}
