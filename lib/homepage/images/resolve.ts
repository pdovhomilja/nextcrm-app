import type { ImageProvider, ImageSpec } from "./types";
import { higgsfieldProvider } from "./higgsfield";
import { openaiProvider } from "./openai";

export function resolveImageProviders(opts: { provider: string; model: string }): ImageProvider[] {
  const hg = higgsfieldProvider(opts.model);
  const oa = openaiProvider();
  if (opts.provider === "higgsfield") return [hg];
  if (opts.provider === "openai") return [oa];
  return [hg, oa]; // auto
}

export async function generateWithFallback(spec: ImageSpec, providers: ImageProvider[]): Promise<Buffer | null> {
  for (const p of providers) {
    if (!p.isConfigured()) continue;
    try {
      return await p.generateImage(spec);
    } catch (e) {
      console.warn(`[HOMEPAGE_IMAGE] ${p.name} failed for ${spec.token}:`, (e as Error)?.message);
    }
  }
  return null;
}
