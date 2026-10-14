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

export function useLiveSummary(initial?: LiveSummary) {
  return useQuery({
    queryKey: ["live-summary"],
    queryFn: fetchLiveSummary,
    initialData: initial,
    staleTime: 12_000,
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
  });
}
