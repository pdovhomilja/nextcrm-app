"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Connection = {
  id: string;
  provider: string;
  accountEmail: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export function CalendarConnectionsList() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/profile/calendar-connections");
    if (res.ok) setConnections((await res.json()).connections);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function disconnect(id: string) {
    await fetch(`/api/profile/calendar-connections/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Calendar connections</h3>
        <Button asChild size="sm">
          <a href="/api/profile/calendar-connections/google/authorize">
            Connect Google Calendar
          </a>
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : connections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No calendars connected.</p>
      ) : (
        <ul className="space-y-2">
          {connections.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded border p-2">
              <div>
                <p className="text-sm font-medium">{c.accountEmail}</p>
                <p className="text-xs text-muted-foreground">
                  {c.isActive
                    ? c.lastSyncedAt
                      ? `Synced ${new Date(c.lastSyncedAt).toLocaleString()}`
                      : "Waiting for first sync"
                    : `Needs reconnect${c.lastSyncError ? `: ${c.lastSyncError}` : ""}`}
                </p>
              </div>
              <div className="flex gap-2">
                {!c.isActive && (
                  <Button asChild size="sm" variant="secondary">
                    <a href="/api/profile/calendar-connections/google/authorize">Reconnect</a>
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => disconnect(c.id)}>
                  Disconnect
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
