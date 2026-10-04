import type { Locale, PluginDefinition } from "@nextcrm/plugin-sdk";
import { generatedPlugins } from "./plugins.generated";

export interface GeneratedPluginEntry {
  source: "public" | "private";
  definition: PluginDefinition;
  messages: Partial<Record<Locale, Record<string, unknown>>>;
}

export type RegisteredPlugin = GeneratedPluginEntry;

export function buildRegistry(entries: GeneratedPluginEntry[]): RegisteredPlugin[] {
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.definition.id)) throw new Error(`Duplicate plugin id: ${e.definition.id}`);
    seen.add(e.definition.id);
  }
  return entries;
}

let registry: RegisteredPlugin[] | null = null;

export function getRegistry(): RegisteredPlugin[] {
  if (!registry) registry = buildRegistry(generatedPlugins);
  return registry;
}

export function findPlugin(id: string): RegisteredPlugin | undefined {
  return getRegistry().find((p) => p.definition.id === id);
}
