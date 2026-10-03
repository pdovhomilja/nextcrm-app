export type PassUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_creation_tokens?: number | null;
};

type Rate = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** USD per 1,000,000 tokens. Keyed by the exact HOMEPAGE_MODELS ids. */
export const HOMEPAGE_MODEL_PRICING: Record<string, Rate> = {
  "claude-sonnet-5-5": { input: 2.0, output: 10.0, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4.0, output: 20.0, cacheRead: 0.2, cacheWrite: 5.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0, cacheRead: 0.1, cacheWrite: 1.25 },
};

const num = (x: number | null | undefined): number =>
  typeof x === "number" && Number.isFinite(x) ? x : 0;

export function computePassCostUsd(usage: PassUsage, model: string | null | undefined): number {
  const rate = model ? HOMEPAGE_MODEL_PRICING[model] : undefined;
  if (!rate) return 0;
  return (
    (num(usage.input_tokens) * rate.input +
      num(usage.output_tokens) * rate.output +
      num(usage.cache_read_tokens) * rate.cacheRead +
      num(usage.cache_creation_tokens) * rate.cacheWrite) /
    1_000_000
  );
}

export type VersionCostInput = PassUsage & {
  pass_kind: "AUTO" | "HUMAN" | "UPLOAD";
  model: string | null;
  created_at: Date;
};

export type TargetCostSummary = {
  generations: number;
  lastGenerationAt: Date | null;
  model: string | null;
  modelCount: number;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  hasUntracked: boolean;
};

/**
 * Aggregate one homepage's versions into a per-target summary. Only AUTO/HUMAN
 * passes (real model calls) count toward generations, cost and last-gen date;
 * UPLOAD versions are ignored.
 */
export function summarizeHomepageCost(versions: VersionCostInput[]): TargetCostSummary {
  const gens = versions
    .filter((v) => v.pass_kind === "AUTO" || v.pass_kind === "HUMAN")
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  let totalCostUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let hasUntracked = false;
  const models = new Set<string>();
  for (const v of gens) {
    totalCostUsd += computePassCostUsd(v, v.model);
    inputTokens += num(v.input_tokens);
    outputTokens += num(v.output_tokens);
    if (v.model) models.add(v.model);
    else hasUntracked = true;
  }

  return {
    generations: gens.length,
    lastGenerationAt: gens[0]?.created_at ?? null,
    model: gens[0]?.model ?? null,
    modelCount: models.size,
    totalCostUsd,
    inputTokens,
    outputTokens,
    hasUntracked,
  };
}
