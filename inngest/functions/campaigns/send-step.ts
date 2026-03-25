import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";

const resend = new Resend(process.env.RESEND_API_KEY);

export const campaignSendStep = inngest.createFunction(
  {
    id: "campaign-send-step",
    name: "Campaign: Send Step",
    triggers: [{ event: "campaigns/send-step" }],
  },
  async ({ event, step }) => {
    const { sendId, campaignId } = event.data as {
      sendId: string;
      campaignId: string;
    };

    const sendRecord = await step.run("load-send-record", async () => {
      return prismadb.crm_campaign_sends.findUnique({
        where: { id: sendId },
        include: {
          campaign: { select: { status: true, from_name: true, reply_to: true } },
          step: { include: { template: true } },
          target: true,
        },
      });
    });

    if (!sendRecord) return { skipped: true, reason: "send record not found" };
    if (sendRecord.campaign.status === "paused") return { skipped: true, reason: "paused" };

    const html = resolveMergeTags(sendRecord.step.template.content_html, sendRecord.target);

    const fromAddress = sendRecord.campaign.from_name
      ? `${sendRecord.campaign.from_name} <${process.env.RESEND_FROM_EMAIL}>`
      : process.env.RESEND_FROM_EMAIL!;

    const result = await step.run("send-email", async () => {
      return resend.emails.send({
        from: fromAddress,
        to: sendRecord.email,
        subject: resolveMergeTags(sendRecord.step.subject, sendRecord.target),
        html,
        ...(sendRecord.campaign.reply_to ? { replyTo: sendRecord.campaign.reply_to } : {}),
        headers: {
          "List-Unsubscribe": `<${process.env.NEXTAUTH_URL}/api/campaigns/unsubscribe?token=${sendRecord.unsubscribe_token}>`,
        },
      });
    });

    await step.run("update-send-record", async () => {
      if (result.error) {
        return prismadb.crm_campaign_sends.update({
          where: { id: sendId },
          data: { status: "failed", error_message: result.error?.message },
        });
      }
      return prismadb.crm_campaign_sends.update({
        where: { id: sendId },
        data: {
          status: "sent",
          resend_message_id: result.data?.id,
          sent_at: new Date(),
        },
      });
    });

    return { sent: !result.error };
  }
);
