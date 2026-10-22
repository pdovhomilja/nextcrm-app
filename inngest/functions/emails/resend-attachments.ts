import { inngest } from "@/inngest/client";
import { fetchAndPersistResendInboundAttachments } from "@/lib/email/resend-receiving-attachments";
import { prismadb } from "@/lib/prisma";

export const emailResendAttachments = inngest.createFunction(
  {
    id: "email-resend-attachments",
    name: "Email: Resend inbound attachments",
    concurrency: { limit: 6 },
    triggers: [{ event: "email/resend-attachments" }],
  },
  async ({ event }) => {
    const { emailId, resendEmailId } = event.data as {
      emailId: string;
      resendEmailId: string;
    };

    const attachments = await fetchAndPersistResendInboundAttachments(resendEmailId);
    if (attachments.length === 0) return { updated: false };

    await prismadb.email.update({
      where: { id: emailId },
      data: { attachments },
    });
    return { updated: true, count: attachments.length };
  }
);
