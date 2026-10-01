import { prismadb } from "@/lib/prisma";

export const HOMEPAGE_MODELS = [
  "claude-sonnet-5-5",
  "claude-opus-5-5",
  "claude-haiku-4-5-20251001",
] as const;
export type HomepageModel = (typeof HOMEPAGE_MODELS)[number];

export const DEFAULT_HOMEPAGE_MODEL: HomepageModel = "claude-sonnet-5-5";
// Non-streaming vision call shares the render step's ~300s function budget (render up to RENDER_TIMEOUT_MS + the ~200s generate abort). 16000 truncated real homepages (hit max_tokens on the initial pass → the run failed); 24000 completed a full 4-pass generation on QA well within budget. Larger admin values may abort on very large pages — streaming is the follow-up (see LESSONS_LEARNED). Admins can still raise this per-env via homepage.max_tokens up to the model ceiling.
export const DEFAULT_MAX_TOKENS = 24000;
export const MAX_TOKENS_FLOOR = 4000;
export const MODEL_MAX_TOKENS: Record<HomepageModel, number> = {
  "claude-sonnet-5-5": 64000,
  "claude-opus-5-5": 64000,
  "claude-haiku-4-5-20251001": 32000,
};

const KEY_MODEL = "homepage.model";
const KEY_MAX_TOKENS = "homepage.max_tokens";
const KEY_BASE_PROMPT_ID = "homepage.base_prompt_id";

/** Clamp to [MAX_TOKENS_FLOOR, model ceiling]; NaN/invalid falls back to DEFAULT_MAX_TOKENS first. */
export function clampMaxTokens(model: HomepageModel, n: number): number {
  const value = Number.isFinite(n) ? n : DEFAULT_MAX_TOKENS;
  return Math.min(MODEL_MAX_TOKENS[model], Math.max(MAX_TOKENS_FLOOR, value));
}

/** Stored value in the allow-set -> itself; anything else -> default. */
export function resolveModel(stored: string | null | undefined): HomepageModel {
  return (HOMEPAGE_MODELS as readonly string[]).includes(stored ?? "")
    ? (stored as HomepageModel)
    : DEFAULT_HOMEPAGE_MODEL;
}

export type HomepageSettings = {
  model: HomepageModel;
  maxTokens: number;
  basePromptId: string | null;
};

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const rows = await prismadb.crm_SystemSettings.findMany({
    where: { key: { in: [KEY_MODEL, KEY_MAX_TOKENS, KEY_BASE_PROMPT_ID] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const model = resolveModel(map.get(KEY_MODEL));
  const maxTokens = clampMaxTokens(
    model,
    parseInt(map.get(KEY_MAX_TOKENS) ?? "", 10),
  );
  return { model, maxTokens, basePromptId: map.get(KEY_BASE_PROMPT_ID) || null };
}
