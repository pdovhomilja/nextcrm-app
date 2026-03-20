import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const leadTools = [
  {
    name: "list_leads",
    description: "List CRM leads assigned to the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Leads.findMany({
          where: { assigned_to: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Leads.count({ where: { assigned_to: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_lead",
    description: "Get a single CRM lead by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const lead = await prismadb.crm_Leads.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!lead) throw new Error("NOT_FOUND");
      return { data: lead };
    },
  },
  {
    name: "search_leads",
    description: "Search leads by name, company, or email (substring match)",
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
        assigned_to: userId,
        OR: [
          {
            firstName: { contains: args.query, mode: "insensitive" as const },
          },
          {
            lastName: { contains: args.query, mode: "insensitive" as const },
          },
          { email: { contains: args.query, mode: "insensitive" as const } },
          {
            company: { contains: args.query, mode: "insensitive" as const },
          },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Leads.findMany({
          where,
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Leads.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_lead",
    description: "Create a new CRM lead",
    schema: z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
    }),
    async handler(args: { firstName?: string; lastName: string; email?: string; company?: string; phone?: string; jobTitle?: string }, userId: string) {
      const { lastName, ...rest } = args;
      const lead = await prismadb.crm_Leads.create({
        data: {
          v: 0,
          lastName,
          ...rest,
          assigned_to: userId,
          createdBy: userId,
        },
      });
      return { data: lead };
    },
  },
  {
    name: "update_lead",
    description: "Update an existing CRM lead by ID",
    schema: z.object({
      id: z.string().uuid(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
    }),
    async handler(
      args: { id: string; firstName?: string; lastName?: string; email?: string; company?: string; phone?: string; jobTitle?: string },
      userId: string
    ) {
      const existing = await prismadb.crm_Leads.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");
      const { id, ...updateData } = args;
      const lead = await prismadb.crm_Leads.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return { data: lead };
    },
  },
];
