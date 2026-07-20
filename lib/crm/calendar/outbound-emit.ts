import { inngest } from "@/inngest/client";
import type { OutboundAction } from "./outbound";

// How long we're willing to let the user's save wait on the Inngest event
// API before giving up and letting the save proceed. The SDK retries `send`
// internally with backoff and there is no fetch timeout configured on the
// client, so without a race here an event-API outage would stall every
// meeting create/update/delete for seconds.
const EMIT_TIMEOUT_MS = 1500;

// Fire-and-forget: an emit failure (or slowness) must never fail or block
// the user's activity save.
export async function emitCalendarOutbound(
  activityId: string,
  action: OutboundAction
): Promise<void> {
  try {
    const sendPromise = inngest.send({
      name: "crm/calendar.outbound-sync",
      data: { activityId, action },
    });

    // If `sendPromise` rejects after the timeout wins the race, this
    // `catch` still runs (it stays attached to `sendPromise`), so the
    // rejection is observed here instead of surfacing as an unhandled
    // rejection later.
    const observedSend = sendPromise.catch((error) => {
      console.error(
        "[calendar-outbound] emit failed:",
        error instanceof Error ? error.message : String(error)
      );
    });

    let timeoutHandle: ReturnType<typeof setTimeout>;
    const timeout = new Promise<void>((resolve) => {
      timeoutHandle = setTimeout(resolve, EMIT_TIMEOUT_MS);
    });

    try {
      await Promise.race([observedSend, timeout]);
    } finally {
      clearTimeout(timeoutHandle!);
    }
  } catch (error) {
    console.error(
      "[calendar-outbound] emit failed:",
      error instanceof Error ? error.message : String(error)
    );
  }
}
