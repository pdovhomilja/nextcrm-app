"use client";
import { useEffect, useState } from "react";

const OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Renders a timestamp in the VIEWER's locale/timezone. Server-rendered (and on
 * the first client paint) as a stable UTC date — deterministic, so no hydration
 * mismatch — then refined to the local date+time after mount.
 */
export function LocalDateTime({ iso }: { iso: string | null }) {
  const [mounted, setMounted] = useState(false);
  // setTimeout(0) defers the setState out of the effect body (satisfies
  // react-hooks/set-state-in-effect); the local format applies right after mount.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  if (!iso) return <>—</>;
  const d = new Date(iso);
  return (
    <span>{mounted ? d.toLocaleString(undefined, OPTS) : d.toISOString().slice(0, 10)}</span>
  );
}
