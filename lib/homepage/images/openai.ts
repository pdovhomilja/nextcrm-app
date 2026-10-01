import type { ImageProvider, ImageSpec } from "./types";

// gpt-image-1 supports 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait).
const SIZE: Record<ImageSpec["aspectRatio"], string> = {
  "16:9": "1536x1024",
  "2:3": "1024x1536",
};

/** Abort a hung connection; gpt-image-1 can take a while, so this is generous. */
const REQUEST_TIMEOUT_MS = 90_000;

export function openaiProvider(): ImageProvider {
  const key = () => process.env.OPENAI_API_KEY;
  return {
    name: "openai",
    isConfigured: () => !!key(),
    async generateImage(spec: ImageSpec): Promise<Buffer> {
      const k = key();
      if (!k) throw new Error("openai not configured");
      // OPENAI_BASE_URL is a test seam (mirrors ANTHROPIC_BASE_URL); unset in deployed scopes.
      const base = process.env.OPENAI_BASE_URL || "https://api.openai.com";
      const res = await fetch(`${base}/v1/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${k}`, "content-type": "application/json" },
        // gpt-image-1 always returns base64 (no `url` / `response_format`); default format is PNG.
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: spec.prompt,
          size: SIZE[spec.aspectRatio],
          n: 1,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`openai images ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error("openai images: no b64_json");
      return Buffer.from(b64, "base64");
    },
  };
}
