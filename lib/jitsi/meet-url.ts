/** Free Jitsi Meet (meet.jit.si) — voice, video, and screen share; no API key. */

export function sanitizeJitsiRoomName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "VenSaiRoom";
}

export function buildJitsiMeetUrl(roomName: string, displayName?: string): string {
  const room = sanitizeJitsiRoomName(roomName);
  const base = `https://meet.jit.si/${encodeURIComponent(room)}`;
  const params = new URLSearchParams({
    config: JSON.stringify({ prejoinPageEnabled: false, startWithAudioMuted: true }),
  });
  if (displayName?.trim()) {
    params.set("userInfo.displayName", displayName.trim().slice(0, 64));
  }
  return `${base}#${params.toString()}`;
}

export function teamRoomName(kind: "general" | "dm", id?: string) {
  if (kind === "general") return "VenSaiCRM-Team-General";
  return sanitizeJitsiRoomName(`VenSaiCRM-DM-${id ?? "call"}`);
}
