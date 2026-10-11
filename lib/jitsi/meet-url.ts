/** Free Jitsi Meet (meet.jit.si) — voice, video, and screen share; no API key. */

export function sanitizeJitsiRoomName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "VenSaiRoom";
}

/** Flat hash params — Jitsi does not read a single JSON `config=` blob. */
function jitsiHashFragment(displayName?: string): string {
  const params = [
    "config.prejoinPageEnabled=false",
    "config.enableWelcomePage=false",
    "config.enableLobby=false",
    "config.hideLobbyButton=true",
    "config.disableDeepLinking=true",
    "config.startWithAudioMuted=true",
    "config.requireDisplayName=false",
  ];
  if (displayName?.trim()) {
    params.push(
      `userInfo.displayName=${encodeURIComponent(displayName.trim().slice(0, 64))}`
    );
  }
  return params.join("&");
}

export function buildJitsiMeetUrl(roomName: string, displayName?: string): string {
  const room = sanitizeJitsiRoomName(roomName);
  return `https://meet.jit.si/${room}#${jitsiHashFragment(displayName)}`;
}

export function jitsiConfigOverwrite() {
  return {
    prejoinPageEnabled: false,
    enableWelcomePage: false,
    enableLobby: false,
    hideLobbyButton: true,
    disableDeepLinking: true,
    startWithAudioMuted: true,
    requireDisplayName: false,
  } as const;
}

export function jitsiInterfaceConfigOverwrite() {
  return {
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
  } as const;
}

/** Short stable room id for DMs (avoid long uuid strings in the title bar). */
export function dmMeetRoomSuffix(roomKey: string): string {
  let h = 0;
  for (let i = 0; i < roomKey.length; i++) h = (h * 31 + roomKey.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function teamRoomName(kind: "general" | "dm", id?: string) {
  if (kind === "general") return "VenSaiCRM-Team-General";
  return sanitizeJitsiRoomName(`VenSaiCRM-DM-${id ?? "call"}`);
}
