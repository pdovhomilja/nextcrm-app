"use client";

import { useState } from "react";

export default function LinkedInConnectButton({ action }: { action: () => Promise<{ url: string }> }) {
  const [busy, setBusy] = useState(false);
  async function handleConnect() {
    setBusy(true);
    try {
      const { url } = await action();
      if (window.self !== window.top) window.open(url, "_blank", "noopener,noreferrer");
      else window.location.href = url;
    } finally {
      setBusy(false);
    }
  }
  return <button onClick={handleConnect} disabled={busy} className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-wait disabled:opacity-60">{busy ? "Opening LinkedIn…" : "Connect LinkedIn"}</button>;
}
