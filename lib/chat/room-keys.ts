/** Stable chat room keys stored in TeamChatMessage.roomKey */

export const GENERAL_CHAT_ROOM = "general";

export function dmRoomKey(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `dm:${a}:${b}`;
}

export function conferenceRoomKey(scheduleId: string): string {
  return `conf:${scheduleId}`;
}

export function parseRoomKey(raw?: string | null): string {
  const v = raw?.trim();
  if (!v || v === GENERAL_CHAT_ROOM) return GENERAL_CHAT_ROOM;
  if (v.startsWith("dm:") || v.startsWith("conf:")) return v;
  return GENERAL_CHAT_ROOM;
}

export function parseAttendeeIds(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string");
}
