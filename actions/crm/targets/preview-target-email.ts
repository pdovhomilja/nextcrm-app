"use server";
import { prismadb } from "@/lib/prisma";
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

export const previewTargetEmail = async ({
  targetId,
  templateId,
  subject,
  bodyHtml,
  includeHomepage,
}: {
  targetId: string;
  templateId: string;
  subject: string;
  bodyHtml: string;
  includeHomepage: boolean;
}): Promise<{ data: { html: string; subject: string } } | { error: string }> => {
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
    where: { id: templateId, deletedAt: null },
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
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl: "#" });
    return { data: { html, subject: resolveMergeTags(subject, mergeSource) } };
  } catch (e) {
    if (e instanceof TemplateBodyError) return { error: e.message };
    throw e;
  }
};
