"use server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { campaignTemplateReadScopeWhere } from "@/lib/authz/scopes/crm";
import {
  deliverTargetEmail,
  resolveTargetRecipient,
} from "@/lib/campaigns/send-target-email-core";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { writeAuditLog } from "@/lib/audit-log";

const sendInputSchema = z.object({
  targetId: z.string().uuid("Invalid target"),
  templateId: z.string().uuid("Select a valid template"),
  subject: z.string().trim().min(1, "Subject is required"),
  bodyHtml: z.string().trim().min(1, "Email body is required"),
  includeHomepage: z.boolean().optional().default(false),
  promptUsed: z.string().optional(),
});

export const sendTargetEmail = async (input: {
  targetId: string;
  templateId: string;
  subject: string;
  bodyHtml: string;
  includeHomepage?: boolean;
  promptUsed?: string;
}): Promise<{ data: { id: string } } | { error: string }> => {
  const parsed = sendInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  // Use the parsed (trimmed) values, not the raw input.
  const { targetId, templateId, subject, bodyHtml, includeHomepage, promptUsed } = parsed.data;

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

  const recipient = resolveTargetRecipient(target);
  if (!recipient) return { error: "This target has no email address." };

  // Same read scope as the template picker: a template the caller cannot read is not-found.
  const template = await prismadb.crm_campaign_templates.findFirst({
    where: { id: templateId, ...campaignTemplateReadScopeWhere(user) },
  });
  if (!template) return { error: "Template not found" };

  const result = await deliverTargetEmail({
    target,
    recipient,
    template,
    subject,
    bodyHtml,
    includeHomepage,
    promptUsed,
    createdBy: user.id,
  });
  if (!result.ok) {
    if (result.kind === "config") return { error: "Sending is not configured (missing base URL)." };
    if (result.kind === "compose") return { error: result.message };
    return { error: "Failed to send email." };
  }

  // The email is already out. Nothing below may surface as an error, or the
  // operator retries and the prospect gets a duplicate cold email.
  try {
    await createActivity({
      type: "email",
      title: `Outreach email sent: ${result.resolvedSubject}`,
      date: new Date(),
      status: "completed",
      metadata: { target_email_id: result.draftId },
      links: [{ entityType: "target", entityId: targetId }],
    });

    await writeAuditLog({
      entityType: "target",
      entityId: targetId,
      action: "updated",
      changes: [{ field: "outreach_email_sent", old: null, new: result.resolvedSubject }],
      userId: user.id,
    });

    revalidatePath("/[locale]/(routes)/campaigns/targets/[targetId]", "page");
  } catch (e) {
    console.error("[SEND_TARGET_EMAIL_POST_SEND]", e);
  }

  return { data: { id: result.draftId } };
};
