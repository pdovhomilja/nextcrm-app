"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ambient backdrop + centered column for the reading pane. */
export function EmailReadCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-full", className)}>
      <div
        className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-70"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-20%,hsl(var(--primary)/0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_50%_at_100%_50%,hsl(262_83%_58%/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--muted)/0.35),transparent_40%,hsl(var(--muted)/0.2))]" />
      </div>
      <div className="relative mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}

export function EmailBodyCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-card/95 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-card/90 dark:shadow-black/25 dark:ring-white/[0.06]",
        className
      )}
    >
      {children}
    </div>
  );
}
