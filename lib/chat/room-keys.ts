/** Stable chat room keys stored in TeamChatMessage.roomKey */

export const GENERAL_CHAT_ROOM = "general";

export function dmRoomKey(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `dm:${a}:${b}`;
}

export function parseRoomKey(raw?: string | null): string {
  const v = raw?.trim();
  if (!v || v === GENERAL_CHAT_ROOM) return GENERAL_CHAT_ROOM;
  if (v.startsWith("dm:")) return v;
  return GENERAL_CHAT_ROOM;
}
