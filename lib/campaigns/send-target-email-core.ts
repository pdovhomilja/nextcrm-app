// Fork-owned. Shared delivery core for one-off target outreach emails.
//
// Both the web server action (actions/crm/targets/send-target-email.ts) and the
// MCP tool (lib/mcp/tools/crm-target-email.ts) run the same steps after their own
// AUTH + GATE checks (target scope, approval, do-not-email, recipient, template
// scope — which stay in the callers because authentication differs). This module
// must NOT import from "@/lib/authz" (it pulls in better-auth, which breaks the
// MCP/Jest path); callers own authorization.
//
// Order (safety-critical): unsubscribe base URL present (fail-closed) -> homepage
// -> merge source -> compose -> DRAFT row -> render -> Resend send -> SENT/FAILED.
import { Resend } from "resend";
import type { crm_Target_Email } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import {
  composeTargetEmailContent,
  buildTargetMergeSource,
  resolveTargetRecipient,
  TemplateBodyError,
} from "@/lib/campaigns/compose-target-email";
import { redirectRecipients } from "@/lib/email/redirect";

type RecipientSource = Parameters<typeof resolveTargetRecipient>[0];

// Defined in compose-target-email.ts (dependency leaf, avoids an import cycle);
// re-exported here as the shared send-path entry point.
export { resolveTargetRecipient };

function unsubscribeBaseUrl(): string | null {
  const base = process.env.NEXTAUTH_URL;
  return base && base.trim() !== "" ? base : null;
}

/**
 * Public one-click unsubscribe URL for a target email token, or null when
 * NEXTAUTH_URL is unset/empty (fail-closed: never send with a dead link).
 */
export function buildTargetUnsubscribeUrl(token: string): string | null {
  const base = unsubscribeBaseUrl();
  if (!base) return null;
  return `${base}/api/crm/targets/unsubscribe?token=${token}`;
}

export const MISSING_BASE_URL_MESSAGE = "Sending is not configured (missing base URL).";

type TargetForSend = Parameters<typeof buildTargetMergeSource>[0] & {
  id: string;
} & RecipientSource;

export type DeliverTargetEmailResult =
  | {
      ok: true;
      draftId: string;
      resolvedSubject: string;
      /** The full updated SENT row, or null if the post-send SENT write failed (email is out regardless). */
      sent: crm_Target_Email | null;
    }
  | {
      ok: false;
      kind: "config" | "compose" | "send";
      message: string;
    };

export async function deliverTargetEmail(params: {
  target: TargetForSend;
  recipient: string;
  template: { id: string; content_html: string };
  subject: string;
  bodyHtml: string;
  includeHomepage: boolean;
  /** Optional CTA button (already resolved to the final label/link to use for
   *  THIS send — callers apply any template-default fallback). Merge tags are
   *  resolved here against the target; the shell escapes + scheme-checks. */
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  /** Reply-To for the send (the sending operator's email) so prospect replies
   *  reach a real inbox instead of the noreply From. Omitted -> no Reply-To. */
  replyTo?: string | null;
  promptUsed?: string;
  createdBy: string;
}): Promise<DeliverTargetEmailResult> {
  const { target, recipient, template, subject, bodyHtml, includeHomepage, ctaLabel, ctaUrl, replyTo, createdBy } = params;

  // Fail closed BEFORE any DRAFT row or Resend call: no email with a dead
  // unsubscribe link (CAN-SPAM / one-click compliance).
  if (!unsubscribeBaseUrl()) {
    return { ok: false, kind: "config", message: MISSING_BASE_URL_MESSAGE };
  }

  const homepage = includeHomepage
    ? await prismadb.crm_Target_Homepage.findFirst({
        where: { targetId: target.id, deletedAt: null },
      })
    : null;
  const mergeSource = buildTargetMergeSource(target, homepage);

  let contentHtml: string;
  try {
    contentHtml = composeTargetEmailContent({
      templateHtml: template.content_html,
      bodyHtml,
      mergeSource,
    });
  } catch (e) {
    if (e instanceof TemplateBodyError) {
      return { ok: false, kind: "compose", message: e.message };
    }
    throw e;
  }
  const resolvedSubject = resolveMergeTags(subject, mergeSource);

  // Draft row first so we have an id + unsubscribe token for the List-Unsubscribe URL.
  const draft = await prismadb.crm_Target_Email.create({
    data: {
      targetId: target.id,
      template_id: template.id,
      subject: resolvedSubject,
      body_html: bodyHtml,
      prompt_used: params.promptUsed,
      included_homepage: includeHomepage && homepage?.status === "READY",
      status: "DRAFT",
      created_by: createdBy,
    },
  });

  const markFailed = async (message: string) => {
    try {
      await prismadb.crm_Target_Email.update({
        where: { id: draft.id },
        data: { status: "FAILED", error_message: message },
      });
    } catch (e) {
      // Never let a bookkeeping failure mask the send failure.
      console.error("[SEND_TARGET_EMAIL_MARK_FAILED]", e);
    }
  };

  // Render + send: any failure (returned OR thrown) marks the row FAILED so it is
  // never left stuck in DRAFT.
  let messageId: string | undefined;
  try {
    const unsubscribeUrl = buildTargetUnsubscribeUrl(draft.unsubscribe_token);
    if (!unsubscribeUrl) throw new Error(MISSING_BASE_URL_MESSAGE);
    const html = await renderCampaignEmail({
      contentHtml,
      unsubscribeUrl,
      // Resolve merge tags (e.g. {{homepage_url}}) against this target WITHOUT
      // escaping — the shell escapes label + scheme-checks the URL.
      ctaLabel: ctaLabel ? resolveMergeTags(ctaLabel, mergeSource) : undefined,
      ctaUrl: ctaUrl ? resolveMergeTags(ctaUrl, mergeSource) : undefined,
    });
    const resend = new Resend(process.env.RESEND_CAMPAIGNS_API_KEY || process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: redirectRecipients(recipient),
      ...(replyTo && replyTo.trim() ? { replyTo: replyTo.trim() } : {}),
      subject: resolvedSubject,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) {
      await markFailed(result.error.message);
      return { ok: false, kind: "send", message: result.error.message };
    }
    messageId = result.data?.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(message);
    return { ok: false, kind: "send", message };
  }

  // The email is already out. Nothing below may surface as an error, or the
  // caller retries and the prospect gets a duplicate cold email.
  let sent: crm_Target_Email | null = null;
  try {
    sent = await prismadb.crm_Target_Email.update({
      where: { id: draft.id },
      data: { status: "SENT", resend_message_id: messageId, sent_at: new Date() },
    });
  } catch (e) {
    console.error("[SEND_TARGET_EMAIL_MARK_SENT]", e);
  }

  return { ok: true, draftId: draft.id, resolvedSubject, sent };
}
