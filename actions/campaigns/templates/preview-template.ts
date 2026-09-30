"use server";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";

export const previewTemplate = async (data: {
  contentHtml: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}): Promise<{ html?: string; error?: string }> => {
  try {
    await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const html = await renderCampaignEmail({
    contentHtml: data.contentHtml,
    unsubscribeUrl: "#",
    ctaLabel: data.ctaLabel,
    ctaUrl: data.ctaUrl,
  });
  return { html };
};
