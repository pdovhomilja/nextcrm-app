"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  campaignTemplateReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

/**
 * Slim template list for pickers (e.g. the target AI-email drawer). Same read
 * scope as `getTemplates`, but without `content_html` / `content_json`. Includes
 * the CTA defaults so a picker can inherit them (and let the operator override).
 */
export const listTemplateOptions = async (): Promise<
  { id: string; name: string; cta_label: string | null; cta_url: string | null }[]
> => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  return prismadb.crm_campaign_templates.findMany({
    where: campaignTemplateReadScopeWhere(user),
    orderBy: { created_on: "desc" },
    select: { id: true, name: true, cta_label: true, cta_url: true },
  });
};
