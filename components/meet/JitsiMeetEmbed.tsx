"use client";

import { buildJitsiMeetUrl } from "@/lib/jitsi/meet-url";

type Props = {
  roomName: string;
  displayName?: string;
  className?: string;
};

/** Embedded call — screen sharing is in Jitsi's toolbar (free). */
export function JitsiMeetEmbed({ roomName, displayName, className }: Props) {
  const src = buildJitsiMeetUrl(roomName, displayName);

  return (
    <iframe
      title="Video call"
      src={src}
      allow="camera; microphone; display-capture; fullscreen; autoplay"
      className={className ?? "h-[min(70vh,520px)] w-full rounded-xl border border-border/60 bg-black"}
    />
  );
}
