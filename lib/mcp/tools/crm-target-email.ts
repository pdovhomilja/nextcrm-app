// Fork-owned MCP tool: send a one-off outreach email to an approved target.
// The web action (actions/crm/targets/send-target-email.ts) derives the user from
// the better-auth session, which does not exist on the MCP bearer-token path, so
// the same steps are performed inline here, scoped by the MCP-authenticated userId.
// Safety order mirrors the web action: approval gate -> do_not_email guard ->
// recipient resolve -> DRAFT row -> render + send -> SENT/FAILED.
import { z } from "zod";
import { Resend } from "resend";
import { prismadb } from "@/lib/prisma";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import {
  composeTargetEmailContent,
  buildTargetMergeSource,
} from "@/lib/campaigns/compose-target-email";
import { redirectRecipients } from "@/lib/email/redirect";
import { writeAuditLog } from "@/lib/audit-log";
import { itemResponse, notFound, validationError, externalError } from "../helpers";

export const crmTargetEmailTools = [
  {
    name: "crm_send_target_email",
    description:
      "Send a one-off outreach email to an APPROVED target using a campaign template as the wrapper. Provide the AI-written body HTML and subject. Refuses non-approved or do-not-email targets.",
    schema: z.object({
      target_id: z.string().uuid(),
      template_id: z.string().uuid(),
      subject: z.string().min(1),
      body_html: z.string().min(1),
      include_homepage: z.boolean().optional(),
    }),
    async handler(
      args: {
        target_id: string;
        template_id: string;
        subject: string;
        body_html: string;
        include_homepage?: boolean;
      },
      userId: string
    ) {
      const target = await prismadb.crm_Targets.findFirst({
        where: { id: args.target_id, created_by: userId, deletedAt: null },
      });
      if (!target) notFound("Target");
      if (target.triage_status !== "APPROVED")
        validationError("Target must be approved before outreach");
      if (target.do_not_email) validationError("Target is marked do-not-email");
      const recipient = target.email ?? target.company_email ?? target.personal_email;
      if (!recipient) validationError("Target has no email address");

      const template = await prismadb.crm_campaign_templates.findFirst({
        where: { id: args.template_id, deletedAt: null },
      });
      if (!template) notFound("Template");

      const includeHomepage = Boolean(args.include_homepage);
      const homepage = includeHomepage
        ? await prismadb.crm_Target_Homepage.findFirst({
            where: { targetId: args.target_id, deletedAt: null },
          })
        : null;
      const mergeSource = buildTargetMergeSource(target, homepage);

      let contentHtml: string;
      try {
        contentHtml = composeTargetEmailContent({
          templateHtml: template.content_html,
          bodyHtml: args.body_html,
          mergeSource,
        });
      } catch (e) {
        // TemplateBodyError (template missing its body slot) etc.
        return validationError(e instanceof Error ? e.message : String(e));
      }
      const resolvedSubject = resolveMergeTags(args.subject, mergeSource);

      // Draft row first so we have an id + unsubscribe token for List-Unsubscribe.
      const draft = await prismadb.crm_Target_Email.create({
        data: {
          targetId: args.target_id,
          template_id: args.template_id,
          subject: resolvedSubject,
          body_html: args.body_html,
          included_homepage: includeHomepage && homepage?.status === "READY",
          status: "DRAFT",
          created_by: userId,
        },
      });

      const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/api/crm/targets/unsubscribe?token=${draft.unsubscribe_token}`;
      const markFailed = (message: string) =>
        prismadb.crm_Target_Email.update({
          where: { id: draft.id },
          data: { status: "FAILED", error_message: message },
        });

      // Render + send: any failure (returned OR thrown) marks the row FAILED so it
      // is never left stuck in DRAFT.
      let messageId: string | undefined;
      let failure: string | null = null;
      try {
        const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });
        const resend = new Resend(
          process.env.RESEND_CAMPAIGNS_API_KEY || process.env.RESEND_API_KEY
        );
        const result = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: redirectRecipients(recipient),
          subject: resolvedSubject,
          html,
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
        });
        if (result.error) failure = result.error.message;
        else messageId = result.data?.id;
      } catch (err) {
        failure = err instanceof Error ? err.message : String(err);
      }
      if (failure !== null) {
        await markFailed(failure);
        return externalError("Failed to send email");
      }

      // The email is already out: nothing below may surface as an error, or the
      // caller retries and the prospect gets a duplicate cold email.
      try {
        const sent = await prismadb.crm_Target_Email.update({
          where: { id: draft.id },
          data: { status: "SENT", resend_message_id: messageId, sent_at: new Date() },
        });
        await writeAuditLog({
          entityType: "target",
          entityId: args.target_id,
          action: "updated",
          changes: [{ field: "outreach_email_sent", old: null, new: resolvedSubject }],
          userId,
        });
        return itemResponse(sent);
      } catch (e) {
        console.error("[MCP_SEND_TARGET_EMAIL_POST_SEND]", e);
        return itemResponse({ id: draft.id, status: "SENT" as const });
      }
    },
  },
];
