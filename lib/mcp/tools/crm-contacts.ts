import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  softDeleteData,
} from "../helpers";

export const crmContactTools = [
  {
    name: "crm_list_contacts",
    description: "List CRM contacts assigned to the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { assigned_to: userId, deletedAt: null };
      const [data, total] = await Promise.all([
        prismadb.crm_Contacts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Contacts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_contact",
    description: "Get a single CRM contact by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const contact = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId, deletedAt: null },
      });
      if (!contact) notFound("Contact");
      return itemResponse(contact);
    },
  },
  {
    name: "crm_search_contacts",
    description: "Search contacts by name, email, or phone (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        assigned_to: userId,
        deletedAt: null,
        OR: [
          ilike("first_name", args.query),
          ilike("last_name", args.query),
          ilike("email", args.query),
          ilike("office_phone", args.query),
          ilike("mobile_phone", args.query),
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Contacts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Contacts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_contact",
    description: "Create a new CRM contact",
    schema: z.object({
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      office_phone: z.string().optional(),
      mobile_phone: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(
      args: {
        first_name?: string;
        last_name: string;
        email?: string;
        office_phone?: string;
        mobile_phone?: string;
        position?: string;
      },
      userId: string
    ) {
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
      return itemResponse(contact);
    },
  },
  {
    name: "crm_update_contact",
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
      args: {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        office_phone?: string;
        mobile_phone?: string;
        position?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId, deletedAt: null },
      });
      if (!existing) notFound("Contact");
      const { id, ...updateData } = args;
      const contact = await prismadb.crm_Contacts.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(contact);
    },
  },
  {
    name: "crm_delete_contact",
    description: "Soft-delete a CRM contact by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId, deletedAt: null },
      });
      if (!existing) notFound("Contact");
      const contact = await prismadb.crm_Contacts.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: contact.id, deletedAt: contact.deletedAt });
    },
  },
];
