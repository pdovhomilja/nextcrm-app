// lib/crm/calendar/calendly-replay.ts
// Delivery-level replay tolerance for the Calendly webhook. Calendly retries a
// delivery when it does not get a 2xx, and a retry carries the same body, so a
// naive forward would enqueue a duplicate Inngest event per retry. Correctness
// never depends on this cache — upsertCalendarEvent is idempotent on the unique
// (source, externalId) key, so a replayed delivery that slips through is at
// worst duplicate work — but it lets the webhook drop fast replays instead of
// paying for that duplicate work.
//
// The cache is in-memory per process. On a single-instance deployment every
// retry hits the same process and is dropped here. On a multi-instance
// deployment a retry may land on a different process and pass through — which
// is safe, because the downstream upsert still converges to the same row.
const REPLAY_TOLERANCE_MS = 60_000;

const recentDeliveries = new Map<string, number>();

// True when a delivery with the same (event type, invitee, start time) was seen
// within the tolerance window. `start_time` is part of the key so a genuine
// reschedule — same invitee URI, new meeting time — is never mistaken for a
// replay.
export function isCalendlyReplay(
  event: string,
  inviteeUri: string,
  startTime: string,
  now: number = Date.now()
): boolean {
  prune(now);
  const key = `${event}:${inviteeUri}:${startTime}`;
  if (recentDeliveries.has(key)) return true;
  recentDeliveries.set(key, now);
  return false;
}

function prune(now: number) {
  for (const [key, seenAt] of Array.from(recentDeliveries.entries())) {
    if (now - seenAt > REPLAY_TOLERANCE_MS) recentDeliveries.delete(key);
  }
}

// Test hook — clears the process-local window between suites.
export function __resetCalendlyReplayCacheForTests() {
  recentDeliveries.clear();
}
