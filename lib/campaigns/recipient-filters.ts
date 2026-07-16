import { Prisma } from "@prisma/client";

// Shared by campaign send-now / schedule-send "resolve-recipients":
// join only targets that have not globally opted out of email.
export function subscribedTargetsInclude() {
  return {
    targets: {
      where: { target: { do_not_email: false } },
      include: { target: { select: { id: true, email: true } } },
    },
  } satisfies Prisma.crm_TargetListsInclude;
}

// Shared by campaign process-follow-up "filter-recipients":
// a follow-up goes only to recipients whose step-0 send landed,
// who did not unsubscribe, and whose target is not globally suppressed.
export function eligibleFollowUpSendsWhere(step0Id: string, sendTo: string | null) {
  return {
    step_id: step0Id,
    status: { in: ["sent", "delivered"] },
    unsubscribed_at: null,
    target: { do_not_email: false },
    ...(sendTo === "non_openers" ? { opened_at: null } : {}),
  } satisfies Prisma.crm_campaign_sendsWhereInput;
}

// Last-gate guard used by campaign send-step just before dispatching to Resend.
// Returns a skip reason, or null when the send may proceed.
export function sendStepSkipReason(sendRecord: {
  status: string;
  unsubscribed_at: Date | string | null;
  target?: { do_not_email: boolean } | null;
}): string | null {
  if (sendRecord.status === "sent") return "already sent";
  if (sendRecord.unsubscribed_at) return "recipient unsubscribed";
  if (sendRecord.target?.do_not_email) return "recipient globally suppressed";
  return null;
}
