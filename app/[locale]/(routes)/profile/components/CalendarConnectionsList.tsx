"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Connection = {
  id: string;
  provider: string;
  accountEmail: string;
  scopeLevel: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

// Outcome of the Google OAuth callback, passed back as ?calendar=<result>.
const CALLBACK_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  connected: { tone: "success", text: "Google Calendar connected." },
  error: {
    tone: "error",
    text: "Connection failed — ask an admin to check the server logs for [google-calendar-callback].",
  },
  "state-mismatch": {
    tone: "error",
    text: "Sign-in verification failed (state mismatch). Please try connecting again.",
  },
  "no-refresh-token": {
    tone: "error",
    text: "Google did not return a refresh token. Remove this app's access at myaccount.google.com/permissions, then connect again.",
  },
};

export function CalendarConnectionsList() {
  const searchParams = useSearchParams();
  const callbackResult = searchParams.get("calendar");
  const banner = callbackResult ? CALLBACK_MESSAGES[callbackResult] ?? null : null;

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/calendar-connections");
      if (!res.ok) throw new Error(`Failed to load connections (${res.status})`);
      setConnections((await res.json()).connections);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load connections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function disconnect(id: string) {
    try {
      const res = await fetch(`/api/profile/calendar-connections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Disconnect failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    }
  }

  // The OAuth callback writes the granted scope level verbatim, because the
  // stored level must always describe the stored refresh token (a row claiming
  // "readwrite" while holding a readonly token deactivates the whole
  // connection on the first outbound 403). That makes it this button's job not
  // to request LESS than the rep already has: clicking plain "Connect" to
  // re-auth an account with two-way sync enabled must not come back with a
  // readonly grant. Any existing readwrite connection therefore promotes the
  // request to readwrite — matching is by account email server-side, and
  // asking for write scope on a genuinely new second account is at worst a
  // wider consent screen for a rep who has already opted into two-way sync.
  const connectLevel = connections.some((c) => c.scopeLevel === "readwrite")
    ? "readwrite"
    : "readonly";

  return (
    <div className="space-y-3 rounded-lg border p-4">
      {banner && (
        <p
          className={
            banner.tone === "success"
              ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {banner.text}
        </p>
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Calendar connections</h3>
        <Button asChild size="sm">
          <a href={`/api/profile/calendar-connections/google/authorize?level=${connectLevel}`}>
            Connect Google Calendar
          </a>
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
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
                  {c.scopeLevel === "readwrite" ? "Two-way · " : "Inbound only · "}
                  {c.isActive
                    ? c.lastSyncedAt
                      ? `Synced ${new Date(c.lastSyncedAt).toLocaleString()}`
                      : "Waiting for first sync"
                    : `Needs reconnect${c.lastSyncError ? `: ${c.lastSyncError}` : ""}`}
                </p>
              </div>
              <div className="flex gap-2">
                {c.isActive && c.scopeLevel !== "readwrite" && (
                  <Button asChild size="sm" variant="secondary">
                    <a href="/api/profile/calendar-connections/google/authorize?level=readwrite">
                      Enable two-way sync
                    </a>
                  </Button>
                )}
                {!c.isActive && (
                  <Button asChild size="sm" variant="secondary">
                    <a href={`/api/profile/calendar-connections/google/authorize?level=${c.scopeLevel === "readwrite" ? "readwrite" : "readonly"}`}>
                      Reconnect
                    </a>
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
