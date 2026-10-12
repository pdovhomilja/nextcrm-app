"use client";

import { cn } from "@/lib/utils";
import { useModKeyLabel } from "@/hooks/use-mod-key";

type Props = {
  keys: string[];
  className?: string;
};

/** Renders shortcut keys as text (Ctrl / Cmd), not the ⌘ glyph. */
export function KbdShortcut({ keys, className }: Props) {
  const mod = useModKeyLabel();

  const parts = keys.map((k) => (k === "mod" ? mod : k));

  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-border/80 bg-muted/80 px-1.5 font-sans text-[10px] font-medium text-muted-foreground",
        className
      )}
    >
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="inline-flex items-center gap-0.5">
          {i > 0 && <span className="text-muted-foreground/60">+</span>}
          <span>{part}</span>
        </span>
      ))}
    </kbd>
  );
}

export function formatShortcutLabel(keys: string[], modLabel: string) {
  return keys.map((k) => (k === "mod" ? modLabel : k)).join("+");
}
