import type { TeamMember } from "@/actions/team/get-team-directory";

const DM_PREFIX_RE =
  /(?:message|chat with|talk to|dm|ping|tell|ask)\s+([a-z][a-z0-9\s'.-]{1,48}?)(?:\s+about|\s+to|\s+that|:|$)/i;

/** Find a teammate mentioned in natural language (for DM deep links). */
export function findTeamMemberByMention(text: string, team: TeamMember[]): TeamMember | null {
  const trimmed = text.trim();
  if (!trimmed || team.length === 0) return null;

  const prefix = trimmed.match(DM_PREFIX_RE);
  if (prefix?.[1]) {
    const needle = prefix[1].trim().toLowerCase();
    const exact = team.find((m) => m.name.trim().toLowerCase() === needle);
    if (exact) return exact;
    const partial = team.find(
      (m) =>
        m.name.toLowerCase().includes(needle) ||
        needle.includes(m.name.toLowerCase())
    );
    if (partial) return partial;
  }

  const lower = trimmed.toLowerCase();
  let best: TeamMember | null = null;
  let bestLen = 0;
  for (const m of team) {
    const n = m.name.trim().toLowerCase();
    if (n.length < 3) continue;
    if (lower.includes(n) && n.length > bestLen) {
      best = m;
      bestLen = n.length;
    }
  }
  return best;
}

/** Text to pre-fill chat composer after opening a DM. */
export function extractChatDraftFromCommand(text: string, memberName: string): string {
  const about = text.match(/\babout\s+([\s\S]+)/i);
  if (about?.[1]) return about[1].trim();

  const tell = text.match(
    new RegExp(
      `(?:tell|ask|message|ping)\\s+${escapeRegExp(memberName)}\\s+(?:to\\s+)?([\\s\\S]+)`,
      "i"
    )
  );
  if (tell?.[1]) return tell[1].trim();

  const say = text.match(/\bsay\s+([\s\S]+)/i);
  if (say?.[1]) return say[1].trim();

  return "";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
