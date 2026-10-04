import type { DataApi, EntityApi, FindArgs, Permission, ReadApi, RecordData } from "@nextcrm/plugin-sdk";
import { PluginPermissionError } from "./errors";
import { runAsActor } from "./actor";
import { writePluginLog } from "./log";

type Delegate = {
  findUnique(a: unknown): Promise<unknown>;
  findMany(a: unknown): Promise<unknown[]>;
  create(a: unknown): Promise<unknown>;
  update(a: unknown): Promise<unknown>;
};

// Lazy import: lib/prisma imports the rules extension, which builds contexts that import this file.
async function db(): Promise<Record<string, Delegate>> {
  const { prismadb } = await import("@/lib/prisma");
  return prismadb as unknown as Record<string, Delegate>;
}

const SAVED_EVENT: Record<string, string> = {
  crm_Accounts: "crm/account.saved",
  crm_Contacts: "crm/contact.saved",
  crm_Leads: "crm/lead.saved",
  crm_Opportunities: "crm/opportunity.saved",
};

export function createDataApi(pluginId: string, permissions: Permission[]): DataApi {
  const need = (p: Permission) => {
    if (!permissions.includes(p)) throw new PluginPermissionError(pluginId, p);
  };
  // Never return password hashes: for users, drop caller select/include/omit and always omit password.
  const read = (model: string, perm: Permission): ReadApi => ({
    async get(id) {
      need(perm);
      const args = model === "users" ? { where: { id }, omit: { password: true } } : { where: { id } };
      return (await (await db())[model].findUnique(args)) as RecordData | null;
    },
    async find(args: FindArgs = {}) {
      need(perm);
      const { where, orderBy, take, skip } = args;
      const safe = model === "users" ? { where, orderBy, take, skip, omit: { password: true } } : args;
      return (await (await db())[model].findMany({ take: 100, ...safe })) as RecordData[];
    },
  });
  const entity = (model: string, r: Permission, w: Permission): EntityApi => ({
    ...read(model, r),
    async create(data) {
      need(w);
      const row = (await runAsActor({ type: "plugin", pluginId }, async () => (await db())[model].create({ data: { v: 0, ...data } }))) as RecordData;
      await emitSaved(pluginId, model, row.id as string);
      return row;
    },
    async update(id, data) {
      need(w);
      const row = (await runAsActor({ type: "plugin", pluginId }, async () => (await db())[model].update({ where: { id }, data }))) as RecordData;
      await emitSaved(pluginId, model, id);
      return row;
    },
  });
  return {
    accounts: entity("crm_Accounts", "accounts:read", "accounts:write"),
    contacts: entity("crm_Contacts", "contacts:read", "contacts:write"),
    leads: entity("crm_Leads", "leads:read", "leads:write"),
    opportunities: entity("crm_Opportunities", "opportunities:read", "opportunities:write"),
    activities: { find: read("crm_Activities", "activities:read").find },
    users: read("users", "users:read"),
    products: read("crm_Products", "products:read"),
  };
}

async function emitSaved(pluginId: string, model: string, recordId: string) {
  const { inngest } = await import("@/inngest/client");
  void inngest
    .send({ name: SAVED_EVENT[model], data: { record_id: recordId } })
    .catch((e: unknown) => writePluginLog(pluginId, "error", "Failed to emit saved event", { model, recordId, error: String(e) }));
}
