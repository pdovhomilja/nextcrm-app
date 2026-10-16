import { envSecret } from "@/lib/env-secret";
import { geminiModelsToTry } from "@/lib/llm/gemini-models";

type VisionMessage = {
  role: "user";
  content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
};

/**
 * Describe an image with Gemini (free tier). Uses OpenAI-compatible multimodal API.
 */
export async function describeImageWithGemini(params: {
  imageDataUrl: string;
  prompt: string;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey =
    envSecret("GEMINI_API_KEY") ?? envSecret("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY for image analysis (free tier at Google AI Studio).");
  }

  const models = geminiModelsToTry();
  const messages: VisionMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: params.prompt },
        { type: "image_url", image_url: { url: params.imageDataUrl } },
      ],
    },
  ];

  let lastErr: Error | null = null;
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs ?? 60_000);
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.4,
          }),
        }
      );
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(data.error?.message ?? `${res.status}`);
      }
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty vision response");
      return text;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("Vision analysis failed");
}
