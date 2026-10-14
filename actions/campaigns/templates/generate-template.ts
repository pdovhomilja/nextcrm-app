"use server";

import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import {
  completeChatWorkflow,
  parseJsonObject,
  refineCampaignEmailJson,
} from "@/lib/llm";
import {
  campaignEmailSystemPrompt,
  parseQualityMode,
  QUALITY_MODE_CONFIG,
  type AiQualityMode,
} from "@/lib/llm/quality-modes";
import {
  generateCampaignHeroImage,
  injectHeroImageIntoHtml,
} from "@/lib/llm/openrouter-image";

export type GenerateTemplateOptions = {
  mode?: AiQualityMode;
  includeHeroImage?: boolean;
};

export const generateTemplate = async (
  prompt: string,
  options?: GenerateTemplateOptions
): Promise<{
  html: string;
  json: object;
  subject: string;
}> => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    throw e;
  }

  const mode = parseQualityMode(options?.mode);
  const modeConfig = QUALITY_MODE_CONFIG[mode];
  const includeHeroImage = Boolean(options?.includeHeroImage) && mode !== "fast";

  const { content, provider, stages } = await completeChatWorkflow({
    task: "campaign-email",
    userId: user.id,
    userBrief: prompt,
    mode,
    messages: [
      { role: "system", content: campaignEmailSystemPrompt(modeConfig.htmlStyle) },
      { role: "user", content: prompt },
    ],
  });

  if (stages.length > 0) {
    console.info("[generate-template] LLM workflow:", stages.join(" → "));
  }

  let jsonText = content;
  const refined = await refineCampaignEmailJson({
    userId: user.id,
    draftJson: content,
    userPrompt: prompt,
    force: modeConfig.refineJson,
  });
  if (refined) jsonText = refined;

  let parsed: { subject: string; html: string };
  try {
    parsed = parseJsonObject<{ subject: string; html: string }>(jsonText);
  } catch {
    throw new Error(
      `Model returned invalid JSON (${provider}, mode=${mode}). Try Better/Best or add OPENAI_API_KEY.`
    );
  }

  let html = parsed.html ?? "";

  if (includeHeroImage) {
    const imagePrompt = `Professional email marketing hero banner, no text in image: ${prompt.slice(0, 500)}`;
    const imageSrc = await generateCampaignHeroImage({ prompt: imagePrompt, mode });
    if (imageSrc) {
      html = injectHeroImageIntoHtml(html, imageSrc, parsed.subject || "Campaign hero");
      console.info("[generate-template] hero image injected via OpenRouter");
    }
  }

  return {
    subject: parsed.subject ?? "",
    html,
    json: {},
  };
};
