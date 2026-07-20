import { inngest } from "@/inngest/client";
import type { OutboundAction } from "./outbound";

// Fire-and-forget: an emit failure must never fail the user's activity save.
export async function emitCalendarOutbound(
  activityId: string,
  action: OutboundAction
): Promise<void> {
  try {
    await inngest.send({
      name: "crm/calendar.outbound-sync",
      data: { activityId, action },
    });
  } catch (error) {
    console.error(
      "[calendar-outbound] emit failed:",
      error instanceof Error ? error.message : String(error)
    );
  }
}
