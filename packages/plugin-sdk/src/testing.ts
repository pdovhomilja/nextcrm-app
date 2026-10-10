import type { ActivityQuery, Actor, Entity, EntityApi, FindArgs, NotifyInput, OrdersApi, PluginContext, PluginStore, RecordData, RecordStore } from "./types";

type Tables = "accounts" | "contacts" | "leads" | "opportunities" | "orders" | "users" | "products" | "activities";

function matches(row: RecordData, where?: RecordData) {
  return !where || Object.entries(where).every(([k, v]) =>
    v && typeof v === "object" && Array.isArray((v as { in?: unknown[] }).in) ? (v as { in: unknown[] }).in.includes(row[k]) : row[k] === v);
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

export function createTestContext(opts: {
  pluginId?: string;
  settings?: RecordData;
  secrets?: RecordData;
  actor?: Actor;
  data?: Partial<Record<Tables, RecordData[]>>;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
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
      products: table(d.products ?? []),
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
