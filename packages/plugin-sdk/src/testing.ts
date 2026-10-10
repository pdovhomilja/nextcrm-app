import type { ActivityQuery, Actor, Entity, EntityApi, ExternalProductInput, ExternalRuleInput, FindArgs, NotifyInput, OrdersApi, PluginContext, PluginStore, PriceQuote, RecordData, RecordStore } from "./types";

type Tables = "accounts" | "contacts" | "leads" | "opportunities" | "orders" | "users" | "products" | "activities" | "productCategories" | "priceLists" | "priceListRules";

function matchValue(actual: unknown, v: unknown): boolean {
  if (v === null) return actual == null; // an unset column is null in the database
  if (typeof v !== "object") return actual === v;
  const f = v as { in?: unknown[]; equals?: unknown; mode?: string };
  if (Array.isArray(f.in)) return f.in.includes(actual);
  if ("equals" in f) {
    return f.mode === "insensitive" && typeof actual === "string" && typeof f.equals === "string"
      ? actual.toLowerCase() === f.equals.toLowerCase() : actual === f.equals;
  }
  return actual === v;
}

function matches(row: RecordData, where?: RecordData) {
  return !where || Object.entries(where).every(([k, v]) => matchValue(row[k], v));
}

function table(rows: RecordData[]): EntityApi {
  let seq = 0;
  return {
    async get(id) { return rows.find((r) => r.id === id) ?? null; },
    async find(args: FindArgs = {}) {
      const out = rows.filter((r) => matches(r, args.where));
      const [[field, dir] = []] = Object.entries((Array.isArray(args.orderBy) ? args.orderBy[0] : args.orderBy) ?? {});
      if (field) out.sort((a, b) => (String(a[field]) < String(b[field]) ? -1 : String(a[field]) > String(b[field]) ? 1 : 0) * (dir === "desc" ? -1 : 1));
      return out.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? out.length));
    },
    async create(data) { const row = { id: `test-${++seq}`, ...data }; rows.push(row); return row; },
    async update(id, data) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error(`Not found: ${id}`);
      Object.assign(row, data);
      return row;
    },
  };
}

function memoryStore(map: Map<string, unknown>, scope: string): RecordStore {
  const k = (key: string) => `${scope}|${key}`;
  return {
    async get(key) { return (map.has(k(key)) ? map.get(k(key)) : null) as never; },
    async set(key, value) { map.set(k(key), JSON.parse(JSON.stringify(value))); },
    async delete(key) { map.delete(k(key)); },
    async list(prefix = "") {
      return Array.from(map.entries())
        .filter(([key]) => key.startsWith(`${scope}|${prefix}`))
        .map(([key, value]) => ({ key: key.slice(scope.length + 1), value }));
    },
  };
}

function activities(rows: RecordData[]) {
  return {
    find: table(rows).find,
    async findForRecord(entity: Entity, id: string, q: ActivityQuery = {}) {
      const linked = rows.filter((r) =>
        (r.links as { entityType: string; entityId: string }[] | undefined)?.some((l) => l.entityType === entity && l.entityId === id)
        && r.deletedAt == null
        && (!q.types?.length || q.types.includes(r.type as string))
        && (!q.status || r.status === q.status)
        && (!q.since || new Date(r.date as string) >= q.since));
      linked.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
      const skip = q.skip ?? 0;
      return linked.slice(skip, skip + Math.min(q.take ?? 100, 100));
    },
  };
}

function externalProducts(rows: RecordData[]) {
  const t = table(rows);
  return {
    ...t,
    async upsertExternal(ref: string, f: ExternalProductInput) {
      const row = rows.find((r) => r.source === "EXTERNAL" && r.externalRef === ref);
      if (row) { Object.assign(row, f); return { id: row.id as string, created: false }; }
      const created = await t.create({ ...f, source: "EXTERNAL", externalRef: ref, deletedAt: null });
      return { id: created.id as string, created: true };
    },
    async findExternal() {
      return rows.filter((r) => r.source === "EXTERNAL" && r.deletedAt == null).map((r) => ({ id: r.id as string, ref: r.externalRef as string, status: r.status as string }));
    },
  };
}

function externalCategories(rows: RecordData[]) {
  const t = table(rows);
  return {
    async upsertExternal(ref: string, f: { name: string; parentRef: string | null }) {
      const row = rows.find((r) => r.externalRef === ref);
      if (row) { Object.assign(row, f); return { id: row.id as string }; }
      return { id: (await t.create({ ...f, source: "EXTERNAL", externalRef: ref })).id as string };
    },
  };
}

function externalLists(lists: RecordData[], rules: RecordData[]) {
  const t = table(lists);
  return {
    async findExternal() {
      return lists.map((l) => ({ id: l.id as string, ref: l.externalRef as string, name: l.name as string, currency: l.currency as string, isActive: l.isActive as boolean }));
    },
    async replaceExternal(ref: string, list: { name: string; currency: string; isActive: boolean }, next: ExternalRuleInput[]) {
      let row = lists.find((l) => l.externalRef === ref);
      if (row) Object.assign(row, list); else row = await t.create({ ...list, source: "EXTERNAL", externalRef: ref });
      for (let i = rules.length - 1; i >= 0; i--) if (rules[i].priceListId === row.id) rules.splice(i, 1);
      rules.push(...next.map((r) => ({ ...r, priceListId: row!.id })));
      return { id: row.id as string };
    },
  };
}

export function createTestContext(opts: {
  pluginId?: string;
  settings?: RecordData;
  secrets?: RecordData;
  actor?: Actor;
  data?: Partial<Record<Tables, RecordData[]>>;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  prices?: (input: { priceListId: string; productId: string; quantity: string }) => Promise<PriceQuote>;
} = {}): PluginContext & { logs: { level: string; message: string }[]; notifications: NotifyInput[] } {
  const d = opts.data ?? {};
  const map = new Map<string, unknown>();
  const logs: { level: string; message: string }[] = [];
  const notifications: NotifyInput[] = [];
  const log = (level: string) => (message: string) => { logs.push({ level, message }); };
  const store: PluginStore = { ...memoryStore(map, ""), forRecord: (entity, id) => memoryStore(map, `${entity}:${id}`) };
  return {
    plugin: { id: opts.pluginId ?? "test-plugin", version: "0.0.0" },
    actor: opts.actor ?? { type: "system" },
    locale: "en",
    settings: opts.settings ?? {},
    secrets: opts.secrets ?? {},
    data: {
      accounts: table(d.accounts ?? []),
      contacts: table(d.contacts ?? []),
      leads: table(d.leads ?? []),
      opportunities: table(d.opportunities ?? []),
      orders: table(d.orders ?? []) as unknown as OrdersApi,
      users: table(d.users ?? []),
      products: externalProducts(d.products ?? []),
      productCategories: externalCategories(d.productCategories ?? []),
      priceLists: externalLists(d.priceLists ?? [], d.priceListRules ?? []),
      prices: {
        async get(input) {
          if (!opts.prices) throw new Error("No prices mock configured");
          return opts.prices(input);
        },
      },
      activities: activities(d.activities ?? []),
    },
    store,
    http: {
      fetch: async (url, init) => {
        if (!opts.fetch) throw new Error("No fetch mock configured");
        return opts.fetch(url, init);
      },
    },
    notify: async (input) => { notifications.push(input); },
    log: { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") },
    t: (key) => key,
    logs,
    notifications,
  };
}
