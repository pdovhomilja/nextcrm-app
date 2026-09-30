"use server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { campaignTemplateReadScopeWhere } from "@/lib/authz/scopes/crm";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import {
  composeTargetEmailContent,
  buildTargetMergeSource,
  TemplateBodyError,
} from "@/lib/campaigns/compose-target-email";

const previewInputSchema = z.object({
  targetId: z.string().uuid("Invalid target"),
  templateId: z.string().uuid("Select a valid template"),
  subject: z.string().trim().min(1, "Subject is required"),
  bodyHtml: z.string().trim().min(1, "Email body is required"),
  includeHomepage: z.boolean().optional().default(false),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
});

export const previewTargetEmail = async (input: {
  targetId: string;
  templateId: string;
  subject: string;
  bodyHtml: string;
  includeHomepage?: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<{ data: { html: string; subject: string } } | { error: string }> => {
  const parsed = previewInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  // Use the parsed (trimmed) values, not the raw input.
  const { targetId, templateId, subject, bodyHtml, includeHomepage, ctaLabel, ctaUrl } = parsed.data;

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

  const template = await prismadb.crm_campaign_templates.findFirst({
    where: { id: templateId, ...campaignTemplateReadScopeWhere(user) },
  });
  if (!template) return { error: "Template not found" };

  const homepage = includeHomepage
    ? await prismadb.crm_Target_Homepage.findFirst({ where: { targetId, deletedAt: null } })
    : null;

  const mergeSource = buildTargetMergeSource(target, homepage);

  try {
    const contentHtml = composeTargetEmailContent({
      templateHtml: template.content_html,
      bodyHtml,
      mergeSource,
    });
    // Inherit the template's CTA default when not supplied; "" means no button.
    const finalCtaLabel = ctaLabel ?? template.cta_label;
    const finalCtaUrl = ctaUrl ?? template.cta_url;
    const html = await renderCampaignEmail({
      contentHtml,
      unsubscribeUrl: "#",
      ctaLabel: finalCtaLabel ? resolveMergeTags(finalCtaLabel, mergeSource) : undefined,
      ctaUrl: finalCtaUrl ? resolveMergeTags(finalCtaUrl, mergeSource) : undefined,
    });
    return { data: { html, subject: resolveMergeTags(subject, mergeSource) } };
  } catch (e) {
    if (e instanceof TemplateBodyError) return { error: e.message };
    throw e;
  }
};
