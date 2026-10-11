"use client";

import * as React from "react";
import {
  buildJitsiMeetUrl,
  jitsiConfigOverwrite,
  jitsiInterfaceConfigOverwrite,
  sanitizeJitsiRoomName,
} from "@/lib/jitsi/meet-url";

type Props = {
  roomName: string;
  displayName?: string;
  className?: string;
};

type JitsiApi = { dispose: () => void };

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>
    ) => JitsiApi;
  }
}

const SCRIPT_ID = "jitsi-external-api-script";
const SCRIPT_SRC = "https://meet.jit.si/external_api.js";

function loadJitsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.JitsiMeetExternalAPI) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Jitsi script failed")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Jitsi script failed"));
    document.body.appendChild(script);
  });
}

/**
 * Embedded call via Jitsi External API (more reliable than a raw iframe on meet.jit.si).
 * Screen share, mic, and camera are in Jitsi's toolbar.
 */
export function JitsiMeetEmbed({ roomName, displayName, className }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const apiRef = React.useRef<JitsiApi | null>(null);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let cancelled = false;

    void (async () => {
      try {
        await loadJitsiScript();
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        apiRef.current?.dispose();
        node.innerHTML = "";

        const room = sanitizeJitsiRoomName(roomName);
        apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName: room,
          parentNode: node,
          width: "100%",
          height: "100%",
          userInfo: displayName?.trim()
            ? { displayName: displayName.trim().slice(0, 64) }
            : undefined,
          configOverwrite: { ...jitsiConfigOverwrite() },
          interfaceConfigOverwrite: { ...jitsiInterfaceConfigOverwrite() },
        });
      } catch {
        /* fallback: iframe if script blocked */
        if (cancelled || !containerRef.current) return;
        node.innerHTML = "";
        const iframe = document.createElement("iframe");
        iframe.title = "Video call";
        iframe.allow = "camera; microphone; display-capture; fullscreen; autoplay";
        iframe.src = buildJitsiMeetUrl(roomName, displayName);
        iframe.className = "h-full w-full border-0";
        node.appendChild(iframe);
      }
    })();

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
      if (node) node.innerHTML = "";
    };
  }, [roomName, displayName]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[min(70vh,520px)] w-full overflow-hidden rounded-xl border border-border/60 bg-black"}
    />
  );
}

export function openJitsiMeetInNewTab(roomName: string, displayName?: string) {
  const url = buildJitsiMeetUrl(roomName, displayName);
  window.open(url, "_blank", "noopener,noreferrer");
}
