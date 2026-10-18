import { z, type FindArgs, type PluginContext, type RecordData } from "@nextcrm/plugin-sdk";

function validZone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

export const settingsSchema = z.object({
  url: z.string().regex(/^https:\/\/[^\s/]+/, "An https URL, e.g. https://erp.example.com"),
  syncMinutes: z.number().int().min(5).max(1440).default(15),
  defaultCountry: z.string().length(2).default("CZ"),
  currency: z.string().regex(/^[A-Z]{3}$/, "A currency code, e.g. CZK").default("CZK"),
  dryRun: z.boolean().default(true),
  priceLists: z.string().default(""),
  sendOrders: z.boolean().default(false),
  timeZone: z.string().refine(validZone, "An IANA time zone, e.g. Europe/Prague").default("UTC"),
});
export const secretsSchema = z.object({ apiKey: z.string().regex(/^oxo_[A-Za-z0-9_-]{40}$/, "An OXO ERP API key: oxo_ followed by 40 characters") });

export type Settings = z.infer<typeof settingsSchema>;
export type Secrets = z.infer<typeof secretsSchema>;
export type Ctx = PluginContext<Settings, Secrets>;

/** The chosen OXO ERP price lists as a text setting ("3, 7"). */
export const chosenLists = (ctx: Ctx): number[] =>
  Array.from(new Set(ctx.settings.priceLists.split(/[\s,;]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n > 0)));

/** A stored ISO time as "2026-10-18 11:30 (Europe/Prague)", in the instance's time zone. */
export function localTime(ctx: Ctx, iso: string): string {
  const tz = ctx.settings.timeZone;
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} (${tz})`;
}

export const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Admin emails never fail the run that sends them. */
export async function tell(ctx: Ctx, input: Parameters<Ctx["notify"]>[0]): Promise<void> {
  try { await ctx.notify(input); } catch (e) { ctx.log.warn(`Email "${input.subject}" not sent: ${msg(e)}`); }
}

/** Core returns at most 100 rows per find(); read every page. */
export async function findAll(api: { find(args: FindArgs): Promise<RecordData[]> }, where: RecordData, orderBy: RecordData = { id: "asc" }): Promise<RecordData[]> {
  const out: RecordData[] = [];
  for (let skip = 0; ; skip += 100) {
    const rows = await api.find({ where, orderBy, take: 100, skip });
    out.push(...rows);
    if (rows.length < 100) return out;
  }
}
