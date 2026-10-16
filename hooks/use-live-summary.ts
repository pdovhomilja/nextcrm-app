"use client";

import { useQuery } from "@tanstack/react-query";
import type { HeaderNotificationItem } from "@/actions/notifications/header-notifications";

export type LiveSummary = {
  emailUnreadCount: number;
  notificationCount: number;
  chatUnreadCount: number;
  items: HeaderNotificationItem[];
  at: string | null;
};

async function fetchLiveSummary(): Promise<LiveSummary> {
  const res = await fetch("/api/live/summary", { credentials: "include" });
  if (!res.ok) throw new Error("Live summary failed");
  return res.json() as Promise<LiveSummary>;
}

/** Header badges — polled lightly; not loaded on every RSC navigation. */
export function useLiveSummary(placeholder?: LiveSummary) {
  return useQuery({
    queryKey: ["live-summary"],
    queryFn: fetchLiveSummary,
    placeholderData: placeholder,
    staleTime: 45_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
}
