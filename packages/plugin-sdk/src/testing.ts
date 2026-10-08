import type { Actor, EntityApi, FindArgs, NotifyInput, PluginContext, PluginStore, RecordData, RecordStore } from "./types";

type Tables = "accounts" | "contacts" | "leads" | "opportunities" | "users" | "products" | "activities";

function matches(row: RecordData, where?: RecordData) {
  return !where || Object.entries(where).every(([k, v]) => row[k] === v);
}

function table(rows: RecordData[]): EntityApi {
  let seq = 0;
  return {
    async get(id) { return rows.find((r) => r.id === id) ?? null; },
    async find(args: FindArgs = {}) {
      const out = rows.filter((r) => matches(r, args.where));
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
      users: table(d.users ?? []),
      products: table(d.products ?? []),
      activities: { find: table(d.activities ?? []).find },
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
