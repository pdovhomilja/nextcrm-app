import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import {
  accountReadScopeWhere,
  assertCanWriteAccount,
} from "@/lib/authz/scopes/crm";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  softDeleteData,
  assertScopeOrNotFound,
} from "../helpers";

// assertCanWriteAccount intentionally ignores deletedAt (the server actions
// guard it separately), so the MCP write path keeps its own soft-delete check.
async function assertWritableAccount(user: AuthzUser, accountId: string) {
  const row = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
    select: { id: true },
  });
  if (!row) notFound("Account");
  await assertScopeOrNotFound(() => assertCanWriteAccount(user, accountId), "Account");
}

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
          orderBy: { createdAt: "desc" },
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
      "Search accounts visible to the authenticated user by name or website (substring match)",
    schema: z.object({
      query: z.string().min(1),
      ...paginationSchema,
    }),
    async handler(
      args: { query: string; limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      // The read scope itself may carry an `OR`; nest the search terms under
      // `AND` so they intersect the scope instead of replacing it.
      const where = {
        ...accountReadScopeWhere(user),
        AND: [{ OR: [ilike("name", args.query), ilike("website", args.query)] }],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Accounts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_account",
    description: "Create a new CRM account",
    schema: z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      description: z.string().optional(),
      office_phone: z.string().optional(),
      website: z.string().optional(),
    }),
    async handler(
      args: {
        name: string;
        email?: string;
        description?: string;
        office_phone?: string;
        website?: string;
      },
      userId: string
    ) {
      const { name, ...rest } = args;
      const account = await prismadb.crm_Accounts.create({
        data: {
          v: 0,
          name,
          ...rest,
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
          status: "Active",
        },
      });
      return itemResponse(account);
    },
  },
  {
    name: "crm_update_account",
    description: "Update an existing CRM account by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      description: z.string().optional(),
      office_phone: z.string().optional(),
      website: z.string().optional(),
    }),
    async handler(
      args: {
        id: string;
        name?: string;
        email?: string;
        description?: string;
        office_phone?: string;
        website?: string;
      },
      userId: string,
      user: AuthzUser
    ) {
      await assertWritableAccount(user, args.id);
      const { id, ...updateData } = args;
      const account = await prismadb.crm_Accounts.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(account);
    },
  },
  {
    name: "crm_delete_account",
    description: "Soft-delete a CRM account by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string, user: AuthzUser) {
      await assertWritableAccount(user, args.id);
      const account = await prismadb.crm_Accounts.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: account.id, deletedAt: account.deletedAt });
    },
  },
];
