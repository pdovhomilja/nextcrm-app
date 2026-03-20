import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const contactTools = [
  {
    name: "list_contacts",
    description: "List CRM contacts assigned to the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Contacts.findMany({
          where: { assigned_to: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Contacts.count({ where: { assigned_to: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_contact",
    description: "Get a single CRM contact by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const contact = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!contact) throw new Error("NOT_FOUND");
      return { data: contact };
    },
  },
  {
    name: "search_contacts",
    description:
      "Search contacts by name, email, or phone (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      // Schema has office_phone and mobile_phone (no plain "phone")
      const where = {
        assigned_to: userId,
        OR: [
          {
            first_name: { contains: args.query, mode: "insensitive" as const },
          },
          {
            last_name: { contains: args.query, mode: "insensitive" as const },
          },
          { email: { contains: args.query, mode: "insensitive" as const } },
          {
            office_phone: {
              contains: args.query,
              mode: "insensitive" as const,
            },
          },
          {
            mobile_phone: {
              contains: args.query,
              mode: "insensitive" as const,
            },
          },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Contacts.findMany({
          where,
          take: args.limit,
          skip: args.offset,
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Contacts.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_contact",
    description: "Create a new CRM contact",
    schema: z.object({
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      office_phone: z.string().optional(),
      mobile_phone: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(args: { first_name?: string; last_name: string; email?: string; office_phone?: string; mobile_phone?: string; position?: string }, userId: string) {
      const { last_name, ...rest } = args;
      const contact = await prismadb.crm_Contacts.create({
        data: {
          v: 0,
          last_name,
          ...rest,
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return { data: contact };
    },
  },
  {
    name: "update_contact",
    description: "Update an existing CRM contact by ID",
    schema: z.object({
      id: z.string().uuid(),
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      office_phone: z.string().optional(),
      mobile_phone: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(
      args: { id: string; first_name?: string; last_name?: string; email?: string; office_phone?: string; mobile_phone?: string; position?: string },
      userId: string
    ) {
      const existing = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");
      const { id, ...updateData } = args;
      const contact = await prismadb.crm_Contacts.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return { data: contact };
    },
  },
];
