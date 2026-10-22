import "server-only";

import { completeChat } from "@/lib/llm";
import { parseJsonObject } from "@/lib/llm/parse-content";
import {
  appendMemoriesToSystem,
  recallMemoriesForPrompt,
  rememberConversationTurn,
} from "@/lib/mem0/crm-memory";

import { extractLinkedInPostSnippets } from "./post-text";

export type LinkedInLeadQualification = {
  score: number;
  tier: "hot" | "warm" | "cold";
  synopsis: string;
  recommendedStatus: "Qualified" | "New" | "Contacted" | "Lost";
  talkingPoints: string[];
  suggestedCampaignAngle: string;
  funnelNotes: string;
};

export type OrgPulseBrief = {
  synopsis: string;
  themes: string[];
  opportunitiesForOutreach: string[];
  risksOrCompetitorSignals: string[];
};

function icpMem0UserId(): string {
  return process.env.LINKEDIN_MEM0_USER_ID?.trim() || "nextcrm:linkedin-icp";
}

function baseIcpBrief(): string {
  return (
    process.env.LINKEDIN_ICP_BRIEF?.trim() ||
    "B2B SaaS and services buyers: decision-makers at growth-stage companies with clear pain around sales ops, CRM, or outbound."
  );
}

export async function qualifyLinkedInLead(input: {
  lead: {
    firstName?: string | null;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    jobTitle?: string | null;
  };
  rawPayload?: unknown;
  actorUserId?: string;
}): Promise<LinkedInLeadQualification | null> {
  const memories = await recallMemoriesForPrompt({
    userId: actorUserId || icpMem0UserId(),
    query: `${input.lead.company ?? ""} ${input.lead.jobTitle ?? ""} ideal customer profile lead score`,
    surface: "linkedin-icp",
    limit: 8,
  });

  const system = appendMemoriesToSystem(
    `You qualify inbound LinkedIn Lead Gen submissions for a CRM sales funnel.
Return ONLY valid JSON:
{
  "score": 0-100,
  "tier": "hot"|"warm"|"cold",
  "synopsis": "2-4 sentences for the rep",
  "recommendedStatus": "Qualified"|"New"|"Contacted"|"Lost",
  "talkingPoints": ["..."],
  "suggestedCampaignAngle": "one line",
  "funnelNotes": "next CRM action"
}
Score using ICP fit, title seniority, company signal, and form completeness. Be conservative on "Qualified".`,
    `ICP:\n${baseIcpBrief()}\n\n${memories}`
  );

  const userContent = JSON.stringify(
    {
      lead: input.lead,
      rawForm: input.rawPayload ?? null,
    },
    null,
    2
  ).slice(0, 12_000);

  try {
    const { content } = await completeChat({
      task: "quick-copy",
      userId: input.actorUserId,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature: 0.35,
      timeoutMs: 55_000,
    });
    const parsed = parseJsonObject(content) as Partial<LinkedInLeadQualification>;
    if (typeof parsed.synopsis !== "string") return null;

    const score = Math.min(100, Math.max(0, Number(parsed.score) || 0));
    const tier =
      parsed.tier === "hot" || parsed.tier === "warm" || parsed.tier === "cold"
        ? parsed.tier
        : score >= 75
          ? "hot"
          : score >= 45
            ? "warm"
            : "cold";

    const result: LinkedInLeadQualification = {
      score,
      tier,
      synopsis: parsed.synopsis.trim(),
      recommendedStatus:
        parsed.recommendedStatus === "Qualified" ||
        parsed.recommendedStatus === "New" ||
        parsed.recommendedStatus === "Contacted" ||
        parsed.recommendedStatus === "Lost"
          ? parsed.recommendedStatus
          : tier === "hot"
            ? "Qualified"
            : "New",
      talkingPoints: Array.isArray(parsed.talkingPoints)
        ? parsed.talkingPoints.filter((x): x is string => typeof x === "string").slice(0, 6)
        : [],
      suggestedCampaignAngle:
        typeof parsed.suggestedCampaignAngle === "string"
          ? parsed.suggestedCampaignAngle.trim()
          : "",
      funnelNotes: typeof parsed.funnelNotes === "string" ? parsed.funnelNotes.trim() : "",
    };

    void rememberConversationTurn({
      userId: input.actorUserId || icpMem0UserId(),
      surface: "lead-qualification",
      userText: `LinkedIn lead: ${input.lead.firstName ?? ""} ${input.lead.lastName} @ ${input.lead.company ?? "?"}`,
      assistantText: JSON.stringify(result),
    });

    return result;
  } catch (e) {
    console.warn("[linkedin/ai] qualify failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export function formatLeadAiDescription(
  qualification: LinkedInLeadQualification,
  rawNote?: string
): string {
  const lines = [
    rawNote?.trim() || "Imported from LinkedIn Lead Sync webhook",
    "",
    "--- AI qualification ---",
    `Score: ${qualification.score}/100 (${qualification.tier})`,
    `Recommended status: ${qualification.recommendedStatus}`,
    qualification.synopsis,
  ];
  if (qualification.talkingPoints.length) {
    lines.push("", "Talking points:", ...qualification.talkingPoints.map((t) => `- ${t}`));
  }
  if (qualification.suggestedCampaignAngle) {
    lines.push("", `Campaign angle: ${qualification.suggestedCampaignAngle}`);
  }
  if (qualification.funnelNotes) {
    lines.push("", `Funnel: ${qualification.funnelNotes}`);
  }
  return lines.join("\n");
}

export async function summarizeLinkedInOrgActivity(input: {
  organizationId: string;
  postElements: unknown[];
  actorUserId?: string;
}): Promise<OrgPulseBrief | null> {
  const snippets = extractLinkedInPostSnippets(input.postElements, 8);
  if (!snippets.length) return null;

  const memories = await recallMemoriesForPrompt({
    userId: input.actorUserId || icpMem0UserId(),
    query: "LinkedIn content themes ICP outreach",
    surface: "linkedin-icp",
    limit: 5,
  });

  const system = appendMemoriesToSystem(
    `You analyze a company's recent LinkedIn posts for a B2B sales team.
Return ONLY JSON:
{
  "synopsis": "paragraph",
  "themes": ["..."],
  "opportunitiesForOutreach": ["..."],
  "risksOrCompetitorSignals": ["..."]
}
Do not invent posts; only use provided snippets.`,
    memories
  );

  try {
    const { content } = await completeChat({
      task: "quick-copy",
      userId: input.actorUserId,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Organization ID: ${input.organizationId}\n\nPost snippets:\n${snippets
            .map((s, i) => `${i + 1}. ${s}`)
            .join("\n\n")}`,
        },
      ],
      temperature: 0.4,
      timeoutMs: 55_000,
    });
    const parsed = parseJsonObject(content) as Partial<OrgPulseBrief>;
    if (typeof parsed.synopsis !== "string") return null;
    return {
      synopsis: parsed.synopsis.trim(),
      themes: Array.isArray(parsed.themes)
        ? parsed.themes.filter((x): x is string => typeof x === "string")
        : [],
      opportunitiesForOutreach: Array.isArray(parsed.opportunitiesForOutreach)
        ? parsed.opportunitiesForOutreach.filter((x): x is string => typeof x === "string")
        : [],
      risksOrCompetitorSignals: Array.isArray(parsed.risksOrCompetitorSignals)
        ? parsed.risksOrCompetitorSignals.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch (e) {
    console.warn("[linkedin/ai] org summary failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
