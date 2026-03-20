import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const opportunityTools = [
  {
    name: "list_opportunities",
    description: "List CRM opportunities assigned to the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where: { assigned_to: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Opportunities.count({ where: { assigned_to: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_opportunity",
    description: "Get a single CRM opportunity by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const opp = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!opp) throw new Error("NOT_FOUND");
      return { data: opp };
    },
  },
  {
    name: "search_opportunities",
    description:
      "Search opportunities by name or description (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      // Note: crm_Opportunities has no denormalized account name field.
      // We search name + description; to search by account name would require a join.
      const where = {
        assigned_to: userId,
        OR: [
          { name: { contains: args.query, mode: "insensitive" as const } },
          {
            description: {
              contains: args.query,
              mode: "insensitive" as const,
            },
          },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where,
          take: args.limit,
          skip: args.offset,
        }),
        prismadb.crm_Opportunities.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_opportunity",
    description: "Create a new CRM opportunity",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      close_date: z.string().datetime().optional(),
      // budget and expected_revenue are BigInt in the schema; accept number and convert
      budget: z.number().int().min(0).optional(),
      expected_revenue: z.number().int().min(0).optional(),
      currency: z.string().optional(),
      next_step: z.string().optional(),
    }),
    async handler(args: { name: string; description?: string; close_date?: string; budget?: number; expected_revenue?: number; currency?: string; next_step?: string }, userId: string) {
      const { name, budget, expected_revenue, close_date, ...rest } = args;
      const opp = await prismadb.crm_Opportunities.create({
        data: {
          v: 0,
          name,
          ...rest,
          ...(budget !== undefined && { budget: BigInt(budget) }),
          ...(expected_revenue !== undefined && {
            expected_revenue: BigInt(expected_revenue),
          }),
          ...(close_date !== undefined && {
            close_date: new Date(close_date),
          }),
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return { data: opp };
    },
  },
  {
    name: "update_opportunity",
    description: "Update an existing CRM opportunity by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      close_date: z.string().datetime().optional(),
      budget: z.number().int().min(0).optional(),
      expected_revenue: z.number().int().min(0).optional(),
      currency: z.string().optional(),
      next_step: z.string().optional(),
    }),
    async handler(
      args: { id: string; [key: string]: any },
      userId: string
    ) {
      const existing = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");
      const { id, budget, expected_revenue, close_date, ...rest } = args;
      const opp = await prismadb.crm_Opportunities.update({
        where: { id },
        data: {
          ...rest,
          ...(budget !== undefined && { budget: BigInt(budget) }),
          ...(expected_revenue !== undefined && {
            expected_revenue: BigInt(expected_revenue),
          }),
          ...(close_date !== undefined && {
            close_date: new Date(close_date),
          }),
          updatedBy: userId,
        },
      });
      return { data: opp };
    },
  },
];
