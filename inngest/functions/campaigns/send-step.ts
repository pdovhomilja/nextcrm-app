import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { sendStepSkipReason } from "@/lib/campaigns/recipient-filters";
import { campaignSkipReason } from "@/lib/authz/scopes/campaign-not-deleted";
import { buildUnsubscribeUrl } from "@/lib/campaigns/unsubscribe-url";
import { markCampaignSentIfStep0Done } from "@/lib/campaigns/mark-campaign-sent";

export const campaignSendStep = inngest.createFunction(
  {
    id: "campaign-send-step",
    name: "Campaign: Send Step",
    triggers: [{ event: "campaigns/send-step" }],
    // A thrown error (network, Resend 5xx, resendHelper) fails the run after its
    // retries and leaves the send queued or sending, which would keep the campaign sending.
    onFailure: async ({ event, error, step }) => {
      const { sendId, campaignId } = event.data.event.data as {
        sendId: string;
        campaignId: string;
      };
      // Conditional write: a send already recorded as sent/failed stays as it is.
      // A failing run that lost the claim also moves a row the winner holds; the
      // winner's own write still decides the final status.
      await step.run("mark-send-failed", () =>
        prismadb.crm_campaign_sends.updateMany({
          where: { id: sendId, status: { in: ["queued", "sending"] } },
          data: { status: "failed", error_message: error.message },
        })
      );
      await step.run("mark-campaign-sent", () => markCampaignSentIfStep0Done(campaignId));
    },
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
          campaign: { select: { status: true, deletedAt: true, from_name: true, reply_to: true } },
          step: { include: { template: true } },
          target: true,
        },
      });
    });

    if (!sendRecord) return { skipped: true, reason: "send record not found" };
    const campaignReason = campaignSkipReason(sendRecord.campaign);
    if (campaignReason) return { skipped: true, reason: campaignReason };

    const skipReason = sendStepSkipReason(sendRecord);
    if (skipReason) {
      // A skipped recipient may be the last one step 0 was waiting for.
      await step.run("mark-campaign-sent", () => markCampaignSentIfStep0Done(campaignId));
      return { skipped: true, reason: skipReason };
    }

    // Overlapping runs can all pass the checks above (a resume fans out every send
    // again). The status write lets one through; memoized, so a retry of that run
    // continues without claiming again. Its later steps or onFailure finish the
    // campaign, so this run has nothing more to do.
    const claim = await step.run("claim-send", () =>
      prismadb.crm_campaign_sends.updateMany({
        where: { id: sendId, status: { in: ["queued", "failed"] } },
        data: { status: "sending" },
      })
    );
    if (claim.count === 0) return { skipped: true, reason: "claimed by another run" };

    const unsubscribeUrl = buildUnsubscribeUrl(sendRecord.unsubscribe_token);

    const html = await renderCampaignEmail({
      contentHtml: resolveMergeTags(sendRecord.step.template.content_html, sendRecord.target, true),
      unsubscribeUrl,
    });

    const fromAddress = sendRecord.campaign.from_name
      ? `${sendRecord.campaign.from_name} <${process.env.RESEND_FROM_EMAIL}>`
      : process.env.RESEND_FROM_EMAIL!;

    const result = await step.run("send-email", async () => {
      const resend = await resendHelper();
      const sent = await resend.emails.send({
        from: fromAddress,
        to: sendRecord.email,
        subject: resolveMergeTags(sendRecord.step.subject, sendRecord.target),
        html,
        ...(sendRecord.campaign.reply_to ? { replyTo: sendRecord.campaign.reply_to } : {}),
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
        },
      }, {
        // A retry whose first attempt Resend accepted gets that response back, no
        // second mail. Resend stores only accepted requests, for 24 hours, so a
        // send it refused can still be retried with this key.
        idempotencyKey: `campaign-send/${sendId}`,
      });
      // The first attempt is still running at Resend: retry until it can be replayed.
      if (sent.error?.name === "concurrent_idempotent_requests") throw new Error(sent.error.message);
      return sent;
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

    await step.run("mark-campaign-sent", () => markCampaignSentIfStep0Done(campaignId));

    return { sent: !result.error };
  }
);
