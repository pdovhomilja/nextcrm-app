import type { TeamMember } from "@/actions/team/get-team-directory";
import {
  extractChatDraftFromCommand,
  findTeamMemberByMention,
} from "@/lib/assistant/match-team-member";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const COMPOSE_INTENT_RE =
  /\b(send|email|e-mail|mail|write|draft|compose|proposal|reach out)\b/i;

const CHAT_GENERAL_RE = /\b(team chat|open chat|go to chat)\b/i;

const NAV_RE: { re: RegExp; path: string; label: string }[] = [
  { re: /\b(open|go to)\s+(my\s+)?emails?\b/i, path: "/emails", label: "Emails" },
  { re: /\b(open|go to)\s+(my\s+)?inbox\b/i, path: "/emails", label: "Inbox" },
  { re: /\b(open|go to)\s+projects?\b/i, path: "/projects", label: "Projects" },
  { re: /\b(open|go to)\s+crm\b/i, path: "/crm/dashboard", label: "CRM" },
  { re: /\b(open|go to)\s+campaigns?\b/i, path: "/campaigns", label: "Campaigns" },
  { re: /\b(open|go to)\s+schedule\b/i, path: "/schedule", label: "Schedule" },
  { re: /\b(open|go to)\s+linkedin\b/i, path: "/admin/linkedin", label: "LinkedIn" },
  { re: /\b(open|go to)\s+leads?\b/i, path: "/crm/leads", label: "Leads" },
];

export type ComposeEmailIntent = {
  kind: "compose_email";
  to: string;
  prompt: string;
};

export type OpenChatIntent = {
  kind: "open_chat";
};

export type OpenChatDmIntent = {
  kind: "open_chat_dm";
  userId: string;
  peerName: string;
  draft: string;
};

export type NavigateIntent = {
  kind: "navigate";
  path: string;
  label: string;
};

export type GeneralIntent = {
  kind: "general";
  text: string;
};

export type AssistantIntent =
  | ComposeEmailIntent
  | OpenChatIntent
  | OpenChatDmIntent
  | NavigateIntent
  | GeneralIntent;

export function interpretAssistantCommand(
  raw: string,
  options?: { team?: TeamMember[]; currentUserId?: string }
): AssistantIntent {
  const text = raw.trim();
  if (!text) return { kind: "general", text: "" };

  for (const nav of NAV_RE) {
    if (nav.re.test(text)) {
      return { kind: "navigate", path: nav.path, label: nav.label };
    }
  }

  const emailMatch = text.match(EMAIL_RE);
  const team = options?.team ?? [];
  const selfId = options?.currentUserId;
  const peer = findTeamMemberByMention(text, team.filter((m) => m.id !== selfId));

  const dmIntent =
    /\b(message|chat with|talk to|dm|ping|tell|ask)\b/i.test(text) && peer && !emailMatch;

  if (dmIntent && peer) {
    return {
      kind: "open_chat_dm",
      userId: peer.id,
      peerName: peer.name,
      draft: extractChatDraftFromCommand(text, peer.name),
    };
  }

  if (CHAT_GENERAL_RE.test(text) && !emailMatch) {
    return { kind: "open_chat" };
  }

  if (emailMatch && (COMPOSE_INTENT_RE.test(text) || text.length < 320)) {
    return {
      kind: "compose_email",
      to: emailMatch[0],
      prompt: text,
    };
  }

  if (peer && peer.workEmail && COMPOSE_INTENT_RE.test(text)) {
    return {
      kind: "compose_email",
      to: peer.workEmail || peer.email,
      prompt: text,
    };
  }

  return { kind: "general", text };
}

export function buildEmailsComposeQuery(params: {
  to: string;
  prompt: string;
  autoGenerate?: boolean;
}): string {
  const q = new URLSearchParams();
  q.set("composeTo", params.to);
  q.set("composePrompt", params.prompt);
  if (params.autoGenerate !== false) q.set("composeAuto", "1");
  return q.toString();
}

export function buildChatDmQuery(params: { userId: string; draft?: string }): string {
  const q = new URLSearchParams();
  q.set("userId", params.userId);
  if (params.draft?.trim()) q.set("draft", params.draft.trim());
  return q.toString();
}
