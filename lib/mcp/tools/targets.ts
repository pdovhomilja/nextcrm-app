import { z } from "zod";
import { prismadb } from "@/lib/prisma";

// IMPORTANT: crm_Targets uses `created_by` field (NOT `assigned_to`).

export const targetTools = [
  {
    name: "list_targets",
    description: "List CRM targets created by the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({
          where: { created_by: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Targets.count({ where: { created_by: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_target",
    description: "Get a single CRM target by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const target = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId },
      });
      if (!target) throw new Error("NOT_FOUND");
      return { data: target };
    },
  },
  {
    name: "search_targets",
    description: "Search targets by name or email (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        created_by: userId,
        OR: [
          {
            first_name: { contains: args.query, mode: "insensitive" as const },
          },
          {
            last_name: { contains: args.query, mode: "insensitive" as const },
          },
          { email: { contains: args.query, mode: "insensitive" as const } },
          {
            company: { contains: args.query, mode: "insensitive" as const },
          },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({
          where,
          take: args.limit,
          skip: args.offset,
        }),
        prismadb.crm_Targets.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_target",
    description: "Create a new CRM target",
    schema: z.object({
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      mobile_phone: z.string().optional(),
      office_phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(args: { first_name?: string; last_name: string; email?: string; mobile_phone?: string; office_phone?: string; company?: string; position?: string }, userId: string) {
      const { last_name, ...rest } = args;
      const target = await prismadb.crm_Targets.create({
        data: {
          last_name,
          ...rest,
          created_by: userId,
        },
      });
      return { data: target };
    },
  },
  {
    name: "update_target",
    description: "Update an existing CRM target by ID",
    schema: z.object({
      id: z.string().uuid(),
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile_phone: z.string().optional(),
      office_phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(
      args: { id: string; [key: string]: any },
      userId: string
    ) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");
      const { id, ...updateData } = args;
      const target = await prismadb.crm_Targets.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return { data: target };
    },
  },
];
