import { inngest } from "@/inngest/client";
import { ingestResendInboundEmail } from "@/lib/email/resend-inbound";

export const emailResendInbound = inngest.createFunction(
  {
    id: "email-resend-inbound",
    name: "Email: Resend Inbound",
    concurrency: { limit: 10 },
    triggers: [{ event: "email/resend-inbound" }],
  },
  async ({ event, step }) => {
    const { resendEmailId, to, cc, bcc, received_for } = event.data as {
      resendEmailId: string;
      to?: string[];
      cc?: string[];
      bcc?: string[];
      received_for?: string[];
    };

    return step.run("ingest-inbound", () =>
      ingestResendInboundEmail(resendEmailId, { to, cc, bcc, received_for })
    );
  }
);
