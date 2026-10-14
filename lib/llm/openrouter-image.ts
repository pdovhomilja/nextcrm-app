import { envSecret } from "@/lib/env-secret";
import type { AiQualityMode } from "@/lib/llm/quality-modes";
import { QUALITY_MODE_CONFIG } from "@/lib/llm/quality-modes";

type ImageResponse = {
  data?: Array<{ b64_json?: string; url?: string; media_type?: string }>;
  error?: { message?: string };
};

function openRouterHeaders(): Record<string, string> {
  const referer =
    envSecret("OPENROUTER_SITE_URL") ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "https://crm.vensailabs.in";
  const title = envSecret("OPENROUTER_APP_NAME") ?? "VenSai CRM";
  return { "HTTP-Referer": referer, "X-Title": title };
}

function imageModelForMode(mode: AiQualityMode): string {
  const env =
    process.env.LLM_OPENROUTER_IMAGE_MODEL?.trim() ||
    process.env.LLM_OPENROUTER_IMAGE_MODEL_FREE?.trim();
  if (env) return env;
  const tier = QUALITY_MODE_CONFIG[mode].imageTier;
  if (tier === "high") {
    return "google/gemini-2.5-flash-image";
  }
  return "google/gemini-2.5-flash-image";
}

/**
 * Generate a hero image via OpenRouter POST /api/v1/images.
 * Returns a data URL suitable for TipTap / preview (replace with CDN URL before bulk send).
 */
export async function generateCampaignHeroImage(options: {
  prompt: string;
  mode: AiQualityMode;
}): Promise<string | null> {
  const apiKey = envSecret("OPENROUTER_API_KEY");
  if (!apiKey) return null;
  if (QUALITY_MODE_CONFIG[options.mode].imageTier === "skip") return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...openRouterHeaders(),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: imageModelForMode(options.mode),
        prompt: options.prompt.slice(0, 2000),
        n: 1,
        aspect_ratio: "16:9",
      }),
    });

    const data = (await response.json()) as ImageResponse;
    if (!response.ok) {
      console.warn("[openrouter-image]", data.error?.message ?? response.statusText);
      return null;
    }

    const item = data.data?.[0];
    if (item?.url) return item.url;
    if (item?.b64_json) {
      const mime = item.media_type ?? "image/png";
      return `data:${mime};base64,${item.b64_json}`;
    }
    return null;
  } catch (e) {
    console.warn("[openrouter-image] failed", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function injectHeroImageIntoHtml(html: string, imageSrc: string, alt: string): string {
  const imgTag = `<img src="${imageSrc.replace(/"/g, "&quot;")}" alt="${alt.replace(/"/g, "&quot;")}" width="600" style="max-width:100%;height:auto;display:block;border-radius:8px;" />`;

  if (html.includes('id="email-hero"')) {
    return html.replace(
      /(<[^>]*id="email-hero"[^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
      `$1${imgTag}$3`
    );
  }

  const heroBlock = `<div id="email-hero" style="margin:0 0 24px 0;text-align:center;">${imgTag}</div>`;
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (m) => `${m}${heroBlock}`);
  }
  return `${heroBlock}${html}`;
}
