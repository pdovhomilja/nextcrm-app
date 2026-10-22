import { getMem0Client, mem0Configured, mem0UserId } from "./client";

export type Mem0Surface =
  | "assistant"
  | "compose-email"
  | "campaign-email"
  | "linkedin-icp"
  | "lead-qualification";

type SearchHit = { memory?: string; score?: number };

function extractMemories(payload: unknown): SearchHit[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: SearchHit[] }).results;
  return Array.isArray(results) ? results : [];
}

/** Pull top user memories for a feature (non-blocking; returns "" if Mem0 is off or errors). */
export async function recallMemoriesForPrompt(options: {
  userId: string;
  query: string;
  surface: Mem0Surface;
  limit?: number;
}): Promise<string> {
  if (!mem0Configured()) return "";
  const client = getMem0Client();
  if (!client) return "";

  const limit = options.limit ?? 6;
  try {
    const raw = await client.search(options.query, {
      filters: { user_id: mem0UserId(options.userId) },
      topK: limit,
      rerank: true,
    });
    const lines = extractMemories(raw)
      .map((r) => r.memory?.trim() || (r as { data?: { memory?: string } }).data?.memory?.trim())
      .filter(Boolean)
      .slice(0, limit);
    if (!lines.length) return "";
    return [
      `Relevant memories about this user (from past CRM AI use — surface: ${options.surface}):`,
      ...lines.map((m) => `- ${m}`),
      "Use these when helpful; do not contradict explicit instructions in this turn.",
    ].join("\n");
  } catch (e) {
    console.warn("[mem0] recall failed:", e instanceof Error ? e.message : e);
    return "";
  }
}

export function appendMemoriesToSystem(system: string, memoriesBlock: string): string {
  const block = memoriesBlock.trim();
  if (!block) return system;
  return `${system}\n\n${block}`;
}

/** Store a turn for Mem0 to extract facts from (fire-and-forget safe). */
export async function rememberConversationTurn(options: {
  userId: string;
  surface: Mem0Surface;
  userText: string;
  assistantText: string;
}): Promise<void> {
  if (!mem0Configured()) return;
  const client = getMem0Client();
  if (!client) return;

  const user = options.userText.trim().slice(0, 4000);
  const assistant = options.assistantText.trim().slice(0, 4000);
  if (!user || !assistant) return;

  const messages = [
    { role: "user" as const, content: user },
    { role: "assistant" as const, content: assistant },
  ];

  try {
    await client.add(messages, {
      userId: mem0UserId(options.userId),
      metadata: { app: "nextcrm", surface: options.surface },
    });
  } catch (e) {
    console.warn("[mem0] add failed:", e instanceof Error ? e.message : e);
  }
}
