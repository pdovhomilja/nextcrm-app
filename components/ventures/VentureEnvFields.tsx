"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  envContentFromEntries,
  normalizeEnvEntriesForEditor,
  type EnvEntry,
} from "@/lib/ventures/parse-env";

type Props = {
  initialContent: string;
  /** Keep MONGODB_URI in sync with the database URL field above. */
  databaseUrl?: string;
  onSerializedChange?: (serialized: string) => void;
};

const SECRET_KEYS = new Set(["VENTURE_PROVISIONING_SECRET", "SESSION_SECRET", "BETTER_AUTH_SECRET"]);

export function VentureEnvFields({ initialContent, databaseUrl, onSerializedChange }: Props) {
  const [entries, setEntries] = useState<EnvEntry[]>(() =>
    normalizeEnvEntriesForEditor(initialContent),
  );
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    setEntries(normalizeEnvEntriesForEditor(initialContent, databaseUrl ? { MONGODB_URI: databaseUrl } : undefined));
  }, [initialContent, databaseUrl]);

  const serialized = useMemo(
    () => envContentFromEntries(initialContent, entries),
    [initialContent, entries],
  );

  useEffect(() => {
    onSerializedChange?.(serialized);
  }, [serialized, onSerializedChange]);

  useEffect(() => {
    if (!databaseUrl?.trim()) return;
    setEntries((prev) =>
      prev.map((e) => (e.key === "MONGODB_URI" ? { ...e, value: databaseUrl.trim() } : e)),
    );
  }, [databaseUrl]);

  function updateEntry(index: number, patch: Partial<EnvEntry>) {
    setEntries((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addEntry() {
    const key = newKey.trim().replace(/\s+/g, "_").toUpperCase();
    if (!key) return;
    if (entries.some((e) => e.key === key)) return;
    setEntries((prev) => [...prev, { key, value: "" }]);
    setNewKey("");
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div>
        <Label>Environment variables (stored encrypted)</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Parsed from your venture .env — one field per variable. Empty values are omitted when saved.
        </p>
      </div>
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={`${entry.key}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_1fr]">
            <Label className="truncate font-mono text-xs sm:pt-2" htmlFor={`env-key-${index}`}>
              {entry.key}
            </Label>
            <Input
              id={`env-key-${index}`}
              type={SECRET_KEYS.has(entry.key) ? "password" : "text"}
              value={entry.value}
              onChange={(e) => updateEntry(index, { value: e.target.value })}
              className="font-mono text-xs"
              autoComplete="off"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Input
          placeholder="NEW_VAR_NAME"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="max-w-[200px] font-mono text-xs"
        />
        <Button type="button" variant="secondary" size="sm" onClick={addEntry}>
          Add variable
        </Button>
      </div>
      <input type="hidden" name="envContent" value={serialized} readOnly />
    </div>
  );
}
