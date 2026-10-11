import { inngest } from "@/inngest/client";
import { ingestResendInboundEmail } from "@/lib/email/resend-inbound";

export const emailResendInbound = inngest.createFunction(
  {
    id: "email-resend-inbound",
    name: "Email: Resend Inbound",
    triggers: [{ event: "email/resend-inbound" }],
  },
  async ({ event, step }) => {
    const { resendEmailId, to, received_for } = event.data as {
      resendEmailId: string;
      to?: string[];
      received_for?: string[];
    };

    return step.run("ingest-inbound", () =>
      ingestResendInboundEmail(resendEmailId, { to, received_for })
    );
  }
);
