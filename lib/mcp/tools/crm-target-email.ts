// Fork-owned MCP tool: send a one-off outreach email to an approved target.
// The web action (actions/crm/targets/send-target-email.ts) derives the user from
// the better-auth session, which does not exist on the MCP bearer-token path, so
// auth + gates are performed here (scoped by the MCP-authenticated user) and the
// delivery itself is the shared core in lib/campaigns/send-target-email-core.ts.
// Safety order mirrors the web action: approval gate -> do_not_email guard ->
// recipient resolve -> template read-scope -> DRAFT row -> render + send -> SENT/FAILED.
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { campaignTemplateReadScopeWhere } from "@/lib/authz/scopes/crm";
import {
  deliverTargetEmail,
  resolveTargetRecipient,
} from "@/lib/campaigns/send-target-email-core";
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
      userId: string,
      user?: AuthzUser
    ) {
      const target = await prismadb.crm_Targets.findFirst({
        where: { id: args.target_id, created_by: userId, deletedAt: null },
      });
      if (!target) notFound("Target");
      if (target.triage_status !== "APPROVED")
        validationError("Target must be approved before outreach");
      if (target.do_not_email) validationError("Target is marked do-not-email");
      const recipient = resolveTargetRecipient(target);
      if (!recipient) validationError("Target has no email address");

      // Same read scope as the campaigns_* template tools. If the caller's role was
      // not supplied, fall back to the narrowest scope (owner-only), never wider.
      const scopeUser: AuthzUser = user ?? { id: userId, role: "user" };
      const template = await prismadb.crm_campaign_templates.findFirst({
        where: { id: args.template_id, ...campaignTemplateReadScopeWhere(scopeUser) },
      });
      if (!template) notFound("Template");

      const result = await deliverTargetEmail({
        target,
        recipient,
        template,
        subject: args.subject,
        bodyHtml: args.body_html,
        includeHomepage: Boolean(args.include_homepage),
        createdBy: userId,
      });
      if (!result.ok) {
        if (result.kind === "config")
          return externalError("Sending is not configured (missing base URL).");
        if (result.kind === "compose") return validationError(result.message);
        return externalError("Failed to send email");
      }

      // The email is already out: nothing below may surface as an error, or the
      // caller retries and the prospect gets a duplicate cold email.
      const fallback = { id: result.draftId, status: "SENT" as const };
      try {
        await writeAuditLog({
          entityType: "target",
          entityId: args.target_id,
          action: "updated",
          changes: [{ field: "outreach_email_sent", old: null, new: result.resolvedSubject }],
          userId,
        });
        return itemResponse(result.sent ?? fallback);
      } catch (e) {
        console.error("[MCP_SEND_TARGET_EMAIL_POST_SEND]", e);
        return itemResponse(fallback);
      }
    },
  },
];
