import { z, type PluginContext } from "@nextcrm/plugin-sdk";

function validZone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

export const settingsSchema = z.object({
  url: z.string().regex(/^https:\/\/[^\s/]+/, "An https URL, e.g. https://odoo.example.com"),
  database: z.string().min(1),
  syncMinutes: z.number().int().min(5).max(1440).default(15),
  defaultCountry: z.string().length(2).default("CZ"),
  dryRun: z.boolean().default(true),
  priceLists: z.string().default(""),
  sendOrders: z.boolean().default(false),
  fillOwners: z.boolean().default(true),
  timeZone: z.string().refine(validZone, "An IANA time zone, e.g. Europe/Prague").default("UTC"),
});
export const secretsSchema = z.object({ apiKey: z.string().min(1) });

export type Settings = z.infer<typeof settingsSchema>;
export type Secrets = z.infer<typeof secretsSchema>;
export type Ctx = PluginContext<Settings, Secrets>;

/** Plan Ruling 2: the chosen Odoo price lists as a text setting ("242, 245"). */
export const chosenLists = (ctx: Ctx): number[] =>
  Array.from(new Set(ctx.settings.priceLists.split(/[\s,;]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n > 0)));

/** A stored ISO time as "2026-10-11 19:30 (Europe/Prague)", in the instance's time zone. */
export function localTime(ctx: Ctx, iso: string): string {
  const tz = ctx.settings.timeZone;
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} (${tz})`;
}

/** The calendar day (YYYY-MM-DD) of a moment in the instance's time zone. */
export function localDay(ctx: Ctx, d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ctx.settings.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Admin emails never fail the run that sends them: a mail outage is logged and the run carries on. */
export async function tell(ctx: Ctx, input: Parameters<Ctx["notify"]>[0]): Promise<void> {
  try { await ctx.notify(input); } catch (e) { ctx.log.warn(`Email "${input.subject}" not sent: ${e instanceof Error ? e.message : String(e)}`); }
}
