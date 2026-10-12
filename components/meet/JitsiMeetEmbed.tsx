"use client";

import { buildJitsiMeetUrl } from "@/lib/jitsi/meet-url";

type Props = {
  roomName: string;
  displayName?: string;
  className?: string;
};

/** Direct room frame. The external API was loading an 8x8 marketing page inside the CRM. */
export function JitsiMeetEmbed({ roomName, displayName, className }: Props) {
  return (
    <div className={className ?? "relative h-full w-full overflow-hidden bg-black"}>
      <iframe
        title="Video call"
        src={buildJitsiMeetUrl(roomName, displayName)}
        allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write"
        className="h-full w-full border-0"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

export function openJitsiMeetInNewTab(roomName: string, displayName?: string) {
  const url = buildJitsiMeetUrl(roomName, displayName);
  window.open(url, "_blank", "noopener,noreferrer");
}
