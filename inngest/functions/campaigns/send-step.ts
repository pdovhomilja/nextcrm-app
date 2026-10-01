import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { sendStepSkipReason } from "@/lib/campaigns/recipient-filters";
import { redirectRecipients } from "@/lib/email/redirect";

// Campaigns use a dedicated Resend key (domain-restricted to the campaigns sending
// domain, tracking on) — segregated from the transactional key (RESEND_API_KEY, via
// lib/resend.ts). Falls back to RESEND_API_KEY if a separate campaigns key isn't set.
const resend = new Resend(
  process.env.RESEND_CAMPAIGNS_API_KEY || process.env.RESEND_API_KEY
);

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

    const skipReason = sendStepSkipReason(sendRecord);
    if (skipReason) return { skipped: true, reason: skipReason };

    const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/api/campaigns/unsubscribe?token=${sendRecord.unsubscribe_token}`;

    const template = sendRecord.step.template;
    const html = await renderCampaignEmail({
      contentHtml: resolveMergeTags(template.content_html, sendRecord.target, true),
      unsubscribeUrl,
      // CTA label/url are escaped by the shell, so resolve merge tags WITHOUT
      // escaping here to avoid double-escaping.
      ctaLabel: template.cta_label
        ? resolveMergeTags(template.cta_label, sendRecord.target)
        : undefined,
      ctaUrl: template.cta_url
        ? resolveMergeTags(template.cta_url, sendRecord.target)
        : undefined,
    });

    const fromAddress = sendRecord.campaign.from_name
      ? `${sendRecord.campaign.from_name} <${process.env.RESEND_FROM_EMAIL}>`
      : process.env.RESEND_FROM_EMAIL!;

    const result = await step.run("send-email", async () => {
      return resend.emails.send({
        from: fromAddress,
        to: redirectRecipients(sendRecord.email),
        subject: resolveMergeTags(sendRecord.step.subject, sendRecord.target),
        html,
        ...(sendRecord.campaign.reply_to ? { replyTo: sendRecord.campaign.reply_to } : {}),
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          // RFC 8058 one-click — providers POST (not GET) to unsubscribe, matching
          // the route's GET=confirm / POST=mutate design.
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
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
