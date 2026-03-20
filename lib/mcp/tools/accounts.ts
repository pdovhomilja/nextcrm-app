import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const accountTools = [
  {
    name: "list_accounts",
    description: "List CRM accounts assigned to the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({
          where: { assigned_to: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Accounts.count({ where: { assigned_to: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_account",
    description: "Get a single CRM account by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const account = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!account) throw new Error("NOT_FOUND");
      return { data: account };
    },
  },
  {
    name: "search_accounts",
    description: "Search accounts by name or website (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      // Note: industry is a UUID FK — not searchable as a string.
      // Search by name and website only.
      const where = {
        assigned_to: userId,
        OR: [
          { name: { contains: args.query, mode: "insensitive" as const } },
          { website: { contains: args.query, mode: "insensitive" as const } },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({
          where,
          take: args.limit,
          skip: args.offset,
        }),
        prismadb.crm_Accounts.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_account",
    description: "Create a new CRM account",
    schema: z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      description: z.string().optional(),
      office_phone: z.string().optional(),
      website: z.string().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const account = await prismadb.crm_Accounts.create({
        data: {
          v: 0,
          ...args,
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
          status: "Active",
        },
      });
      return { data: account };
    },
  },
  {
    name: "update_account",
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
      args: { id: string; [key: string]: any },
      userId: string
    ) {
      const existing = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");
      const { id, ...updateData } = args;
      const account = await prismadb.crm_Accounts.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return { data: account };
    },
  },
];
