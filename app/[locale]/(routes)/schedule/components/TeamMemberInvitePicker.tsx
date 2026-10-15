"use client";

import * as React from "react";
import { Search } from "lucide-react";

import type { TeamMember } from "@/actions/team/get-team-directory";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  team: TeamMember[];
  selected: string[];
  onChange: (ids: string[]) => void;
  className?: string;
};

function memberHaystack(m: TeamMember): string {
  return [m.name, m.email, m.workEmail ?? ""].join(" ").toLowerCase();
}

export function TeamMemberInvitePicker({ team, selected, onChange, className }: Props) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return team;
    return team.filter((m) => memberHaystack(m).includes(q));
  }, [team, query]);

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...selected, id] : selected.filter((x) => x !== id));
  };

  const selectVisible = () => {
    const ids = new Set(selected);
    for (const m of filtered) ids.add(m.id);
    onChange(Array.from(ids));
  };

  const clearVisible = () => {
    const visible = new Set(filtered.map((m) => m.id));
    onChange(selected.filter((id) => !visible.has(id)));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {selected.length} selected · {filtered.length} shown
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={selectVisible}
            disabled={filtered.length === 0}
          >
            Select shown
          </button>
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={clearVisible}
            disabled={filtered.length === 0}
          >
            Clear shown
          </button>
        </span>
      </div>
      <div className="max-h-40 overflow-y-auto rounded-lg border border-border/80 bg-background p-2 text-sm">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {team.length === 0 ? "No teammates in directory." : "No matches for your search."}
          </p>
        ) : (
          filtered.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.includes(m.id)}
                onChange={(e) => toggle(m.id, e.target.checked)}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-tight">{m.name}</span>
                {(m.workEmail || m.email) && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.workEmail ?? m.email}
                  </span>
                )}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
