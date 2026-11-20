import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { accountReadScopeWhere } from "@/lib/authz/scopes/crm";
import { createAccount, deleteAccount, updateAccount } from "@/lib/crm/accounts/service";
import { AccountError } from "@/lib/crm/accounts/types";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  validationError,
} from "../helpers";

// The writes run in lib/crm/accounts/service.ts, as the server actions do. A
// denied, missing or soft-deleted account, assignee or price list is NOT_FOUND
// (no existence oracle).
async function mapErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AccountError) notFound("Account");
    throw e;
  }
}

// Company identifiers, addresses and a reference to the account's record in
// another system; shared by create and update.
const accountDetailsSchema = {
  company_id: z.string().optional().describe("Company registration number"),
  vat: z.string().optional().describe("VAT number"),
  billing_street: z.string().optional(),
  billing_city: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
  external_ref: z
    .string()
    .optional()
    .describe("Id of this account's record in another system; find it again with crm_search_accounts"),
};
type AccountDetails = Partial<Record<keyof typeof accountDetailsSchema, string>>;

export const crmAccountTools = [
  {
    name: "crm_list_accounts",
    description: "List CRM accounts visible to the authenticated user",
    schema: z.object({
      ...paginationSchema,
    }),
    async handler(
      args: { limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      const where = accountReadScopeWhere(user);
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        prismadb.crm_Accounts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_account",
    description: "Get a single CRM account by ID (visible to the authenticated user)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const account = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, ...accountReadScopeWhere(user) },
      });
      if (!account) notFound("Account");
      return itemResponse(account);
    },
  },
  {
    name: "crm_search_accounts",
    description:
      "Search accounts visible to the authenticated user by name or website (substring match) and/or by exact external_ref, company_id or vat. Give at least one of them; all given filters must match.",
    schema: z.object({
      query: z.string().min(1).optional().describe("Substring of the name or website"),
      external_ref: z.string().min(1).optional().describe("Exact match"),
      company_id: z.string().min(1).optional().describe("Exact match"),
      vat: z.string().min(1).optional().describe("Exact match"),
      ...paginationSchema,
    }),
    async handler(
      args: {
        query?: string;
        external_ref?: string;
        company_id?: string;
        vat?: string;
        limit: number;
        offset: number;
      },
      _userId: string,
      user: AuthzUser
    ) {
      const { query, external_ref, company_id, vat } = args;
      if (!query && !external_ref && !company_id && !vat) {
        validationError("Give query, external_ref, company_id or vat");
      }
      // The read scope itself may carry an `OR`; nest the search terms under
      // `AND` so they intersect the scope instead of replacing it.
      const where = {
        ...accountReadScopeWhere(user),
        AND: [
          ...(query ? [{ OR: [ilike("name", query), ilike("website", query)] }] : []),
          ...(external_ref ? [{ external_ref }] : []),
          ...(company_id ? [{ company_id }] : []),
          ...(vat ? [{ vat }] : []),
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        prismadb.crm_Accounts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_account",
    description:
      "Create a new CRM account (optionally with company id, VAT, billing/shipping address and external_ref)",
    schema: z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      description: z.string().optional(),
      office_phone: z.string().optional(),
      website: z.string().optional(),
      ...accountDetailsSchema,
    }),
    async handler(
      args: {
        name: string;
        email?: string;
        description?: string;
        office_phone?: string;
        website?: string;
      } & AccountDetails,
      _userId: string,
      user: AuthzUser
    ) {
      // Assigned to the caller.
      const account = await mapErrors(() => createAccount(user, args));
      return itemResponse(account);
    },
  },
  {
    name: "crm_update_account",
    description:
      "Update an existing CRM account by ID (including company id, VAT, billing/shipping address and external_ref)",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      description: z.string().optional(),
      office_phone: z.string().optional(),
      website: z.string().optional(),
      ...accountDetailsSchema,
      // Reassign the owner. Use crm_list_users to resolve a person to their ID.
      assigned_to: z.string().uuid().nullable().optional(),
    }),
    async handler(
      args: {
        id: string;
        name?: string;
        email?: string;
        description?: string;
        office_phone?: string;
        website?: string;
        assigned_to?: string | null;
      } & AccountDetails,
      _userId: string,
      user: AuthzUser
    ) {
      const { id, ...input } = args;
      const account = await mapErrors(() => updateAccount(user, id, input));
      return itemResponse(account);
    },
  },
  {
    name: "crm_delete_account",
    description: "Soft-delete a CRM account by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const account = await mapErrors(() => deleteAccount(user, args.id));
      return itemResponse({ id: account.id, deletedAt: account.deletedAt });
    },
  },
];
