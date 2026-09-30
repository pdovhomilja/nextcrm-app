"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import {
  composeTargetEmailContent,
  buildTargetMergeSource,
  TemplateBodyError,
} from "@/lib/campaigns/compose-target-email";
import { redirectRecipients } from "@/lib/email/redirect";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { writeAuditLog } from "@/lib/audit-log";

export const sendTargetEmail = async ({
  targetId,
  templateId,
  subject,
  bodyHtml,
  includeHomepage,
  promptUsed,
}: {
  targetId: string;
  templateId: string;
  subject: string;
  bodyHtml: string;
  includeHomepage: boolean;
  promptUsed: string;
}): Promise<{ data: { id: string } } | { error: string }> => {
  let user;
  try {
    user = await requireAuthenticated();
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const target = await prismadb.crm_Targets.findFirst({ where: { id: targetId, deletedAt: null } });
  if (!target) return { error: "Target not found" };
  if (target.triage_status !== "APPROVED")
    return { error: "Target must be approved before generating outreach" };
  if (target.do_not_email) return { error: "This target is marked do-not-email." };

  const recipient = target.email ?? target.company_email ?? target.personal_email;
  if (!recipient) return { error: "This target has no email address." };

  const template = await prismadb.crm_campaign_templates.findFirst({
    where: { id: templateId, deletedAt: null },
  });
  if (!template) return { error: "Template not found" };

  const homepage = includeHomepage
    ? await prismadb.crm_Target_Homepage.findFirst({ where: { targetId, deletedAt: null } })
    : null;
  const mergeSource = buildTargetMergeSource(target, homepage);

  let contentHtml: string;
  try {
    contentHtml = composeTargetEmailContent({ templateHtml: template.content_html, bodyHtml, mergeSource });
  } catch (e) {
    if (e instanceof TemplateBodyError) return { error: e.message };
    throw e;
  }
  const resolvedSubject = resolveMergeTags(subject, mergeSource);

  // Draft row first so we have an id + unsubscribe token for the List-Unsubscribe URL.
  const draft = await prismadb.crm_Target_Email.create({
    data: {
      targetId,
      template_id: templateId,
      subject: resolvedSubject,
      body_html: bodyHtml,
      prompt_used: promptUsed,
      included_homepage: includeHomepage && homepage?.status === "READY",
      status: "DRAFT",
      created_by: user.id,
    },
  });

  const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/api/crm/targets/unsubscribe?token=${draft.unsubscribe_token}`;

  const markFailed = (message: string) =>
    prismadb.crm_Target_Email.update({
      where: { id: draft.id },
      data: { status: "FAILED", error_message: message },
    });

  // Render + send: any failure (returned OR thrown) marks the row FAILED so it is
  // never left stuck in DRAFT.
  let messageId: string | undefined;
  try {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });
    const from = process.env.RESEND_FROM_EMAIL!;
    const resend = new Resend(process.env.RESEND_CAMPAIGNS_API_KEY || process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from,
      to: redirectRecipients(recipient),
      subject: resolvedSubject,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) {
      await markFailed(result.error.message);
      return { error: "Failed to send email." };
    }
    messageId = result.data?.id;
  } catch (err) {
    await markFailed(err instanceof Error ? err.message : String(err));
    return { error: "Failed to send email." };
  }

  // The email is already out. Nothing below (including the SENT write) may surface
  // as an error, or the operator retries and the prospect gets a duplicate cold email.
  try {
    await prismadb.crm_Target_Email.update({
      where: { id: draft.id },
      data: { status: "SENT", resend_message_id: messageId, sent_at: new Date() },
    });

    await createActivity({
      type: "email",
      title: `Outreach email sent: ${resolvedSubject}`,
      date: new Date(),
      status: "completed",
      metadata: { target_email_id: draft.id },
      links: [{ entityType: "target", entityId: targetId }],
    });

    await writeAuditLog({
      entityType: "target",
      entityId: targetId,
      action: "updated",
      changes: [{ field: "outreach_email_sent", old: null, new: resolvedSubject }],
      userId: user.id,
    });

    revalidatePath("/[locale]/(routes)/campaigns/targets/[targetId]", "page");
  } catch (e) {
    console.error("[SEND_TARGET_EMAIL_POST_SEND]", e);
  }

  return { data: { id: draft.id } };
};
