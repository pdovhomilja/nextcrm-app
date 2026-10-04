import { z } from "zod";
import { parseVersion } from "./version";
import {
  PERMISSIONS, type ExtensionBuilder, type MessageParams, type PluginDefinition,
  type PluginExtensions, type PluginManifest, type RecordData, type Role, type RuleResult,
} from "./types";

const ID = /^[a-z][a-z0-9-]{1,48}$/;
const ALL_ROLES: Role[] = ["user", "manager", "admin"];

export const allow = (): RuleResult => ({ kind: "allow" });
export const reject = (messageKey: string, params?: MessageParams): RuleResult =>
  params ? { kind: "reject", messageKey, params } : { kind: "reject", messageKey };
export const modify = (patch: RecordData): RuleResult => ({ kind: "modify", patch });

function unique(seen: Set<string>, value: string, label: string) {
  if (seen.has(value)) throw new Error(`${label}: ${value}`);
  seen.add(value);
}

export function definePlugin<S extends z.ZodObject<any>, K extends z.ZodObject<any>>(
  manifest: PluginManifest<S, K>,
): PluginDefinition {
  if (!ID.test(manifest.id)) throw new Error(`Invalid plugin id: ${manifest.id}`);
  parseVersion(manifest.version);
  if (!manifest.sdk.startsWith("^")) throw new Error("sdk must be a caret range, e.g. ^0.1.0");
  parseVersion(manifest.sdk.slice(1));
  for (const p of manifest.permissions) {
    if (!(PERMISSIONS as readonly string[]).includes(p)) throw new Error(`Unknown permission: ${p}`);
  }

  const ext: PluginExtensions = {
    rules: [], afters: [], events: [], crons: [], accountTabs: [], accountPanels: [],
    pages: [], adminSections: [], companyRegistries: [],
  };
  const ids = { cron: new Set<string>(), event: new Set<string>(), tab: new Set<string>(), panel: new Set<string>(), page: new Set<string>() };

  const x: ExtensionBuilder<z.infer<S>, z.infer<K>> = {
    rule: (entity, operation, handler, options) =>
      ext.rules.push({ entity, operation, handler, onError: options?.onError ?? "allow", priority: options?.priority ?? 100 }),
    after: (entity, operation, handler) => ext.afters.push({ entity, operation, handler }),
    on: (event, handler) => { unique(ids.event, event, "Duplicate event handler"); ext.events.push({ event, handler }); },
    cron: (id, schedule, handler) => { unique(ids.cron, id, "Duplicate cron id"); ext.crons.push({ id, schedule, handler }); },
    accountTab: (tab) => { unique(ids.tab, tab.id, "Duplicate account tab id"); ext.accountTabs.push({ ...tab, roles: tab.roles ?? ALL_ROLES }); },
    accountPanel: (panel) => { unique(ids.panel, panel.id, "Duplicate account panel id"); ext.accountPanels.push({ ...panel, roles: panel.roles ?? ALL_ROLES }); },
    page: (page) => { unique(ids.page, page.path, "Duplicate page path"); ext.pages.push({ ...page, roles: page.roles ?? ALL_ROLES }); },
    adminSection: (component) => ext.adminSections.push(component),
    companyRegistry: (provider) => ext.companyRegistries.push(provider),
  };
  manifest.extensions(x);

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    sdk: manifest.sdk,
    description: manifest.description,
    permissions: manifest.permissions,
    settings: manifest.settings ?? z.object({}),
    secrets: manifest.secrets ?? z.object({}),
    extensions: ext,
    onInstall: manifest.onInstall as PluginDefinition["onInstall"],
    onUpgrade: manifest.onUpgrade as PluginDefinition["onUpgrade"],
    onUninstall: manifest.onUninstall as PluginDefinition["onUninstall"],
  };
}
