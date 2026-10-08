import { getApiKey } from "@/lib/api-keys";

/**
 * Keys the queued target-enrichment job (inngest/functions/enrich-target.ts)
 * needs: Anthropic through the key tiers, E2B from the environment only.
 * Returns the first missing one, or null when the job can run.
 */
export async function missingTargetEnrichmentKey(
  userId: string
): Promise<"ANTHROPIC" | "E2B_API_KEY" | null> {
  if (!(await getApiKey("ANTHROPIC", userId))) return "ANTHROPIC";
  if (!process.env.E2B_API_KEY) return "E2B_API_KEY";
  return null;
}
