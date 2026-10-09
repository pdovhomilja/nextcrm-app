import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { AuthorizationError, assertCanWritePriceList } from "@/lib/authz";
import { accountReadScopeWhere } from "@/lib/authz/scopes/crm";
import { writeAuditLog } from "@/lib/audit-log";
import { getPrice, resolvePriceListId } from "@/lib/pricing/get-price";
import { PricingError } from "@/lib/pricing/errors";
import { cleanRule, createsListCycle, ruleProblems, type RuleFields } from "@/lib/pricing/validate";
import { paginationSchema, paginationArgs, listResponse, itemResponse, notFound, forbidden, validationError } from "../helpers";

async function writableList(user: AuthzUser, id: string | null) {
  const list = id ? await prismadb.crm_PriceLists.findUnique({ where: { id } }) : null;
  if (id && !list) notFound("PriceList");
  try { assertCanWritePriceList(user, list); } catch (e) { if (e instanceof AuthorizationError) forbidden(); throw e; }
  return list;
}

async function assertCurrency(code: string) {
  if (!(await prismadb.currency.findFirst({ where: { code, isEnabled: true } }))) validationError("currency is not enabled");
}

const ruleSchema = z.object({
  priceListId: z.string(),
  ruleId: z.string().optional(),
  appliesTo: z.enum(["ALL", "CATEGORY", "PRODUCT"]),
  categoryId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  minQuantity: z.number().nullable().optional(),
  dateStart: z.string().nullable().optional(),
  dateEnd: z.string().nullable().optional(),
  computePrice: z.enum(["FIXED", "PERCENTAGE", "FORMULA"]),
  fixedPrice: z.number().nullable().optional(),
  percentPrice: z.number().nullable().optional(),
  base: z.enum(["LIST_PRICE", "COST", "PRICE_LIST"]).optional(),
  basePriceListId: z.string().nullable().optional(),
  priceDiscount: z.number().nullable().optional(),
  priceSurcharge: z.number().nullable().optional(),
  priceRound: z.number().nullable().optional(),
  priceMinMargin: z.number().nullable().optional(),
  priceMaxMargin: z.number().nullable().optional(),
});

export const crmPriceListTools = [
  {
    name: "crm_list_price_lists",
    description: "List price lists (active by default)",
    schema: z.object({ includeArchived: z.boolean().optional(), source: z.enum(["CRM", "EXTERNAL"]).optional(), ...paginationSchema }),
    async handler(args: { includeArchived?: boolean; source?: "CRM" | "EXTERNAL"; limit: number; offset: number }) {
      const where = { ...(args.includeArchived ? {} : { isActive: true }), ...(args.source ? { source: args.source } : {}) };
      const [data, total] = await Promise.all([
        prismadb.crm_PriceLists.findMany({ where, ...paginationArgs(args), orderBy: { name: "asc" } }),
        prismadb.crm_PriceLists.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_price_list",
    description: "Get a price list with its rules",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }) {
      const row = await prismadb.crm_PriceLists.findUnique({ where: { id: args.id }, include: { rules: true } });
      if (!row) notFound("PriceList");
      return itemResponse(row);
    },
  },
  {
    name: "crm_get_price",
    description: "Compute a product's price from a price list, or from the account's list (account list → default list → product price)",
    schema: z.object({ productId: z.string(), quantity: z.number().positive(), date: z.string().optional(), priceListId: z.string().optional(), accountId: z.string().optional() }),
    async handler(args: { productId: string; quantity: number; date?: string; priceListId?: string; accountId?: string }, _userId: string, user: AuthzUser) {
      let priceListId = args.priceListId ?? null;
      if (!priceListId && args.accountId) {
        const account = await prismadb.crm_Accounts.findFirst({ where: { id: args.accountId, ...accountReadScopeWhere(user) }, select: { id: true } });
        if (!account) notFound("Account");
        priceListId = await resolvePriceListId(args.accountId);
      }
      try {
        const r = await getPrice({ priceListId, productId: args.productId, quantity: args.quantity, date: args.date ? new Date(args.date) : undefined });
        return itemResponse({ price: r.price.toFixed(2), listPrice: r.listPrice.toFixed(2), currency: r.currency, ruleId: r.ruleId, priceListId,
          steps: r.steps.map((s) => ({ label: s.label, value: s.value.toFixed(2) })) });
      } catch (e) {
        if (e instanceof PricingError) validationError(e.message);
        throw e;
      }
    },
  },
  {
    name: "crm_create_price_list",
    description: "Create a price list (manager or admin)",
    schema: z.object({ name: z.string().min(1), currency: z.string().length(3) }),
    async handler(args: { name: string; currency: string }, userId: string, user: AuthzUser) {
      await writableList(user, null);
      await assertCurrency(args.currency);
      const row = await prismadb.crm_PriceLists.create({ data: { name: args.name, currency: args.currency, createdBy: userId, updatedBy: userId } });
      await writeAuditLog({ entityType: "price_list", entityId: row.id, action: "created", changes: null, userId });
      return itemResponse(row);
    },
  },
  {
    name: "crm_update_price_list",
    description: "Rename a price list, change its currency or (de)activate it (manager or admin; not external lists)",
    schema: z.object({ id: z.string(), name: z.string().min(1).optional(), currency: z.string().length(3).optional(), isActive: z.boolean().optional() }),
    async handler(args: { id: string; name?: string; currency?: string; isActive?: boolean }, userId: string, user: AuthzUser) {
      await writableList(user, args.id);
      if (args.currency) await assertCurrency(args.currency);
      const { id, ...data } = args;
      const row = await prismadb.crm_PriceLists.update({ where: { id }, data: { ...data, updatedBy: userId } });
      await writeAuditLog({ entityType: "price_list", entityId: id, action: "updated", changes: null, userId });
      return itemResponse(row);
    },
  },
  {
    name: "crm_archive_price_list",
    description: "Archive a price list (manager or admin; not external lists)",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }, userId: string, user: AuthzUser) {
      await writableList(user, args.id);
      const row = await prismadb.crm_PriceLists.update({ where: { id: args.id }, data: { isActive: false, updatedBy: userId } });
      await writeAuditLog({ entityType: "price_list", entityId: args.id, action: "updated", changes: null, userId });
      return itemResponse(row);
    },
  },
  {
    name: "crm_upsert_price_list_rule",
    description: "Create or update a price list rule (Odoo-compatible fields; manager or admin; not external lists)",
    schema: ruleSchema,
    async handler(args: z.infer<typeof ruleSchema>, userId: string, user: AuthzUser) {
      await writableList(user, args.priceListId);
      const { priceListId, ruleId, dateStart, dateEnd, ...rest } = args;
      const fields: RuleFields = { ...rest, dateStart: dateStart ? new Date(dateStart) : null, dateEnd: dateEnd ? new Date(dateEnd) : null };
      const problems = ruleProblems(fields, priceListId);
      if (problems.length) validationError(problems.join(","));
      const data = cleanRule(fields);
      if (data.basePriceListId) {
        if (!(await prismadb.crm_PriceLists.findUnique({ where: { id: data.basePriceListId } }))) notFound("PriceList");
        const edges = (await prismadb.crm_PriceListRules.findMany({
          where: { basePriceListId: { not: null }, ...(ruleId ? { id: { not: ruleId } } : {}) },
          select: { priceListId: true, basePriceListId: true },
        })) as { priceListId: string; basePriceListId: string }[];
        if (createsListCycle(priceListId, data.basePriceListId, edges)) validationError("cycle");
      }
      const row = ruleId
        ? await prismadb.crm_PriceListRules.update({ where: { id: ruleId }, data })
        : await prismadb.crm_PriceListRules.create({ data: { ...data, priceListId } });
      await writeAuditLog({ entityType: "price_list_rule", entityId: row.id, action: ruleId ? "updated" : "created", changes: null, userId });
      return itemResponse(row);
    },
  },
  {
    name: "crm_delete_price_list_rule",
    description: "Delete a price list rule (manager or admin; not external lists)",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }, userId: string, user: AuthzUser) {
      const rule = await prismadb.crm_PriceListRules.findUnique({ where: { id: args.id } });
      if (!rule) notFound("PriceListRule");
      await writableList(user, rule.priceListId);
      await prismadb.crm_PriceListRules.delete({ where: { id: args.id } });
      await writeAuditLog({ entityType: "price_list_rule", entityId: args.id, action: "deleted", changes: null, userId });
      return itemResponse({ id: args.id });
    },
  },
];
