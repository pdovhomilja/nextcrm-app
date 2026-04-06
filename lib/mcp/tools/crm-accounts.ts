import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  isNotDeleted,
  notFound,
} from "../helpers";

export const crmAccountTools = [
  {
    name: "crm_list_accounts",
    description: "List CRM accounts assigned to the authenticated user",
    schema: z.object({
      ...paginationSchema,
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { assigned_to: userId, ...isNotDeleted() };
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
    description: "Get a single CRM account by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const account = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!account) notFound("Account");
      return itemResponse(account);
    },
  },
  {
    name: "crm_search_accounts",
    description: "Search accounts by name or website (substring match)",
    schema: z.object({
      query: z.string().min(1),
      ...paginationSchema,
    }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        assigned_to: userId,
        ...isNotDeleted(),
        OR: [ilike("name", args.query), ilike("website", args.query)],
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
      userId: string
    ) {
      const existing = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!existing) notFound("Account");
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
    description: "Soft-delete a CRM account by ID (sets status to DELETED)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!existing) notFound("Account");
      const account = await prismadb.crm_Accounts.update({
        where: { id: args.id },
        data: { status: "DELETED", updatedBy: userId },
      });
      return itemResponse({ id: account.id, status: "DELETED" });
    },
  },
];
