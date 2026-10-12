import { prismaBase } from "@/lib/prisma-base";
import { getRegistry, type RegisteredPlugin } from "./registry";

export interface PluginStateRow {
  id: string;
  version: string;
  status: "ENABLED" | "DISABLED";
  settings: unknown;
  secrets: string | null;
  installedAt: Date;
  installedBy: string | null;
}

export interface AdminPluginRow {
  id: string;
  name: string;
  description: string;
  version: string | null;            // version in the image, null when missing
  installedVersion: string | null;
  status: "NOT_INSTALLED" | "ENABLED" | "DISABLED" | "MISSING";
  source: "public" | "private" | null;
}

const TTL_MS = 10_000;
let cache: { at: number; rows: PluginStateRow[] } | null = null;

export function invalidatePluginCache(): void {
  cache = null;
}

export async function getPluginStates(): Promise<PluginStateRow[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = (await prismaBase.installedPlugin.findMany()) as PluginStateRow[];
  cache = { at: Date.now(), rows };
  return rows;
}

export async function getPluginState(id: string): Promise<PluginStateRow | undefined> {
  return (await getPluginStates()).find((r) => r.id === id);
}

export async function getEnabledPlugins(): Promise<RegisteredPlugin[]> {
  if (!getRegistry().length) return [];
  const enabled = new Set((await getPluginStates()).filter((r) => r.status === "ENABLED").map((r) => r.id));
  return getRegistry().filter((p) => enabled.has(p.definition.id));
}

export async function listPluginsForAdmin(): Promise<AdminPluginRow[]> {
  const states = new Map((await getPluginStates()).map((r) => [r.id, r]));
  const rows: AdminPluginRow[] = getRegistry().map((p) => {
    const s = states.get(p.definition.id);
    return {
      id: p.definition.id,
      name: p.definition.name,
      description: p.definition.description,
      version: p.definition.version,
      installedVersion: s?.version ?? null,
      status: s ? s.status : "NOT_INSTALLED",
      source: p.source,
    };
  });
  const known = new Set(rows.map((r) => r.id));
  for (const s of Array.from(states.values())) {
    if (!known.has(s.id)) {
      rows.push({ id: s.id, name: s.id, description: "", version: null, installedVersion: s.version, status: "MISSING", source: null });
    }
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}
