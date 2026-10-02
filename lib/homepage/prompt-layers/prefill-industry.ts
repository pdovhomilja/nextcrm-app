import { prismadb } from "@/lib/prisma";
import { matchIndustry } from "./match-industry";

// Create-time convenience: pre-fill crm_Targets.homepage_industry_prompt_id from
// the target's free-text `industry`. Strictly best-effort — a failure here must
// never block creating the target, so every path degrades to "no pre-fill" (null,
// which loadIndustryBody reads as Generic). The drawer dropdown is the manual,
// guaranteed way to set it.

type Matcher = (industry: string | null | undefined) => string | null;

/** Loads the active ORG industry prompts once and returns a reusable matcher. */
export async function createIndustryMatcher(): Promise<Matcher> {
  try {
    const prompts = await prismadb.crm_Ai_Prompt.findMany({
      where: { kind: "HOMEPAGE_INDUSTRY", scope: "ORG", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    return (industry) => matchIndustry(industry ?? null, prompts);
  } catch (e) {
    console.warn(
      "[HOMEPAGE_INDUSTRY_PREFILL] matcher load failed; defaulting to Generic",
      (e as Error)?.message,
    );
    return () => null;
  }
}

/** Single-row form: the matched industry prompt id for `industry`, or null. */
export async function resolveIndustryPromptId(
  industry: string | null | undefined,
): Promise<string | null> {
  if (!industry || !industry.trim()) return null;
  const match = await createIndustryMatcher();
  return match(industry);
}

/**
 * Spread-ready fragment for a crm_Targets create `data` object: the matched
 * `homepage_industry_prompt_id`, or `{}` when there is no match (so the column
 * keeps its null default and existing create payloads are unchanged).
 */
export async function industryPrefillData(
  industry: string | null | undefined,
): Promise<{ homepage_industry_prompt_id?: string }> {
  const id = await resolveIndustryPromptId(industry);
  return id ? { homepage_industry_prompt_id: id } : {};
}
