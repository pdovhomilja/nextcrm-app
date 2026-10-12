import type { DataApi, EntityApi, FindArgs, Permission, ReadApi, RecordData } from "@nextcrm/plugin-sdk";
import { Prisma } from "@prisma/client";
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
  crm_Orders: "crm/order.saved",
};

const LOGICAL = new Set(["AND", "OR", "NOT"]);
const MAX_TAKE = 100;

// Plugins may filter and sort only on their model's own scalar fields, never on password.
function scalarFields(model: string): Set<string> {
  const name = `${model[0].toUpperCase()}${model.slice(1)}ScalarFieldEnum` as keyof typeof Prisma;
  const fields = Object.values((Prisma[name] ?? {}) as Record<string, string>);
  return new Set(fields.filter((f) => f !== "password"));
}

function assertFilter(value: unknown, allowed: Set<string>): void {
  if (Array.isArray(value)) { value.forEach((v) => assertFilter(v, allowed)); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, inner] of Object.entries(value)) {
    if (LOGICAL.has(key)) { assertFilter(inner, allowed); continue; }
    if (!allowed.has(key)) throw new Error(`Invalid filter field: ${key}`);
  }
}

export function createDataApi(pluginId: string, permissions: Permission[]): DataApi {
  const need = (p: Permission) => {
    if (!permissions.includes(p)) throw new PluginPermissionError(pluginId, p);
  };
  // Never return password hashes: only where/orderBy/take/skip reach Prisma (no select/include on any model,
  // so relations to users cannot be loaded), filters are limited to scalar fields (no relation or password
  // filters), and users always omit password.
  const read = (model: string, perm: Permission): ReadApi => ({
    async get(id) {
      need(perm);
      const args = model === "users" ? { where: { id }, omit: { password: true } } : { where: { id } };
      return (await (await db())[model].findUnique(args)) as RecordData | null;
    },
    async find(args: FindArgs = {}) {
      need(perm);
      const { where, orderBy, take, skip } = args;
      const allowed = scalarFields(model);
      assertFilter(where, allowed);
      assertFilter(orderBy, allowed);
      const safe = { where, orderBy, take: Math.max(-MAX_TAKE, Math.min(take ?? MAX_TAKE, MAX_TAKE)), skip };
      return (await (await db())[model].findMany(model === "users" ? { ...safe, omit: { password: true } } : safe)) as RecordData[];
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
    orders: {
      ...read("crm_Orders", "orders:read"),
      async get(id) {
        need("orders:read");
        return (await (await db()).crm_Orders.findUnique({ where: { id }, include: { lines: true } })) as RecordData | null;
      },
      async create(data) {
        need("orders:write");
        const { pluginCreateOrder } = await import("@/lib/orders/plugin-writes");
        const row = (await runAsActor({ type: "plugin", pluginId }, () => pluginCreateOrder(pluginId, data))) as unknown as RecordData;
        await emitSaved(pluginId, "crm_Orders", row.id as string);
        return row;
      },
      async update(id, data) {
        need("orders:write");
        const { pluginUpdateOrder } = await import("@/lib/orders/plugin-writes");
        const row = (await runAsActor({ type: "plugin", pluginId }, () => pluginUpdateOrder(pluginId, id, data))) as unknown as RecordData;
        await emitSaved(pluginId, "crm_Orders", id);
        return row;
      },
    },
    activities: {
      find: read("crm_Activities", "activities:read").find,
      async findForRecord(entityType, entityId, query = {}) {
        need("activities:read");
        const where: RecordData = { deletedAt: null, links: { some: { entityType, entityId } } };
        if (query.types?.length) where.type = { in: query.types };
        if (query.status) where.status = query.status;
        if (query.since) where.date = { gte: query.since };
        const take = Math.max(1, Math.min(query.take ?? MAX_TAKE, MAX_TAKE));
        return (await (await db()).crm_Activities.findMany({ where, orderBy: { date: "desc" }, take, skip: query.skip })) as RecordData[];
      },
    },
    users: read("users", "users:read"),
    products: {
      ...read("crm_Products", "products:read"),
      async upsertExternal(ref, fields) {
        need("products:write");
        const { upsertExternalProduct } = await import("@/lib/catalog/plugin-writes");
        return runAsActor({ type: "plugin", pluginId }, () => upsertExternalProduct(pluginId, ref, fields));
      },
      async findExternal() {
        need("products:read");
        const { findExternalProducts } = await import("@/lib/catalog/plugin-writes");
        return findExternalProducts();
      },
    },
    productCategories: {
      async upsertExternal(ref, fields) {
        need("products:write");
        const { upsertExternalCategory } = await import("@/lib/catalog/plugin-writes");
        return runAsActor({ type: "plugin", pluginId }, () => upsertExternalCategory(pluginId, ref, fields));
      },
    },
    priceLists: {
      async findExternal() {
        need("priceLists:read");
        const { findExternalPriceLists } = await import("@/lib/catalog/plugin-writes");
        return findExternalPriceLists();
      },
      async replaceExternal(ref, list, rules) {
        need("priceLists:write");
        const { replaceExternalPriceList } = await import("@/lib/catalog/plugin-writes");
        return runAsActor({ type: "plugin", pluginId }, () => replaceExternalPriceList(pluginId, ref, list, rules));
      },
    },
    prices: {
      async get(input) {
        need("products:read");
        const { getPrice } = await import("@/lib/pricing/get-price");
        const r = await getPrice({ priceListId: input.priceListId, productId: input.productId, quantity: input.quantity });
        const rule = r.ruleId ? await (await db()).crm_PriceListRules.findUnique({ where: { id: r.ruleId } }) as { base: string } | null : null;
        return { price: r.price.toString(), currency: r.currency, ruleId: r.ruleId, ruleBase: rule?.base ?? null };
      },
    },
  };
}

async function emitSaved(pluginId: string, model: string, recordId: string) {
  const { inngest } = await import("@/inngest/client");
  void inngest
    .send({ name: SAVED_EVENT[model], data: { record_id: recordId, source: pluginId } })
    .catch((e: unknown) => writePluginLog(pluginId, "error", "Failed to emit saved event", { model, recordId, error: String(e) }));
}
