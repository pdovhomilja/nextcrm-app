import type { AfterOperation, Entity, Locale, RecordData, RuleInput, RuleRegistration } from "@nextcrm/plugin-sdk";
import type { RegisteredPlugin } from "./registry";
import { currentActorFrame } from "./actor";
import { PluginRuleError } from "./errors";
import { writePluginLog } from "./log";

export const MODEL_TO_ENTITY: Record<string, Entity> = {
  crm_Accounts: "account",
  crm_Contacts: "contact",
  crm_Leads: "lead",
  crm_Opportunities: "opportunity",
};

const MAX_DEPTH = 3;

export interface RuleDeps {
  getEnabledPlugins: () => Promise<RegisteredPlugin[]>;
  createPluginContext: (args: { plugin: RegisteredPlugin; actor: any; locale?: Locale }) => Promise<any>;
  resolveActor: () => Promise<any>;
  resolveLocale?: () => Promise<Locale>;
  timeoutMs: number;
}

const defaultDeps = async (): Promise<RuleDeps> => ({
  getEnabledPlugins: (await import("./state")).getEnabledPlugins,
  createPluginContext: (await import("./context")).createPluginContext,
  resolveActor: (await import("./actor")).resolveActor,
  resolveLocale,
  timeoutMs: 500,
});

// Rules format user-facing text (dates, numbers); outside a request there is no locale, so en.
async function resolveLocale(): Promise<Locale> {
  try {
    const { getLocale } = await import("next-intl/server");
    return (await getLocale()) as Locale;
  } catch {
    return "en";
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Rule timed out after ${ms} ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function hasRules(entity: Entity, deps?: RuleDeps): Promise<boolean> {
  const d = deps ?? (await defaultDeps());
  return (await d.getEnabledPlugins()).some((p) => p.definition.extensions.rules.some((r) => r.entity === entity));
}

export async function runBeforeRules(input: RuleInput, deps?: RuleDeps): Promise<RecordData> {
  const d = deps ?? (await defaultDeps());
  const frame = currentActorFrame();
  if ((frame?.depth ?? 0) > MAX_DEPTH) throw new Error(`Plugin write depth exceeded (max ${MAX_DEPTH})`);
  const writer = frame?.actor.type === "plugin" ? frame.actor.pluginId : null;

  const matches: { plugin: RegisteredPlugin; rule: RuleRegistration }[] = [];
  for (const plugin of await d.getEnabledPlugins()) {
    if (plugin.definition.id === writer) continue;
    for (const rule of plugin.definition.extensions.rules) {
      if (rule.entity === input.entity && rule.operation === input.operation) matches.push({ plugin, rule });
    }
  }
  if (!matches.length) return input.data;
  matches.sort((a, b) => a.rule.priority - b.rule.priority || a.plugin.definition.id.localeCompare(b.plugin.definition.id));

  const actor = await d.resolveActor();
  const locale = d.resolveLocale ? await d.resolveLocale() : "en";
  let data = { ...input.data };
  for (const { plugin, rule } of matches) {
    const id = plugin.definition.id;
    let result;
    try {
      const run = async () => rule.handler({ ...input, data }, await d.createPluginContext({ plugin, actor, locale }));
      result = await withTimeout(run(), d.timeoutMs);
    } catch (e) {
      writePluginLog(id, "error", `Rule ${input.entity}.${input.operation} failed: ${String(e)}`);
      if (rule.onError === "block") throw new PluginRuleError(null, "ruleUnavailable");
      continue;
    }
    if (result.kind === "reject") throw new PluginRuleError(id, result.messageKey, result.params);
    if (result.kind === "modify") data = { ...data, ...result.patch };
  }
  return data;
}

export async function afterTargets(entity: Entity, operation: AfterOperation, deps?: RuleDeps): Promise<string[]> {
  const d = deps ?? (await defaultDeps());
  return (await d.getEnabledPlugins())
    .filter((p) => p.definition.extensions.afters.some((a) => a.entity === entity && a.operation === operation))
    .map((p) => p.definition.id);
}
