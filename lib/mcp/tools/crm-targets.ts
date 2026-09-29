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

export const crmTargetTools = [
  {
    name: "crm_list_targets",
    description: "List CRM targets created by the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { created_by: userId, deletedAt: null };
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Targets.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_target",
    description: "Get a single CRM target by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const target = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId, deletedAt: null },
      });
      if (!target) notFound("Target");
      return itemResponse(target);
    },
  },
  {
    name: "crm_search_targets",
    description: "Search targets by name, email, or company (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        created_by: userId,
        deletedAt: null,
        OR: [
          ilike("first_name", args.query),
          ilike("last_name", args.query),
          ilike("email", args.query),
          ilike("company", args.query),
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Targets.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_target",
    description: "Create a new CRM target",
    schema: z.object({
      first_name: z.string().min(1).optional(),
      // fork: last_name is optional so a company-only target (no person) can be
      // created — the handler requires last_name OR company and defaults the
      // non-null column to "". Mirrors the UI CSV importer (last_name ?? "").
      last_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile_phone: z.string().optional(),
      office_phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
      // fork: extended to full CSV-import field parity (lib/spreadsheet/target-fields.ts)
      company_website: z.string().optional(),
      personal_website: z.string().optional(),
      social_linkedin: z.string().optional(),
      social_x: z.string().optional(),
      social_instagram: z.string().optional(),
      social_facebook: z.string().optional(),
      personal_email: z.string().email().optional(),
      company_email: z.string().email().optional(),
      company_phone: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      industry: z.string().optional(),
      employees: z.string().optional(),
      description: z.string().optional(),
    }),
    async handler(
      args: {
        first_name?: string;
        last_name?: string;
        email?: string;
        mobile_phone?: string;
        office_phone?: string;
        company?: string;
        position?: string;
        company_website?: string;
        personal_website?: string;
        social_linkedin?: string;
        social_x?: string;
        social_instagram?: string;
        social_facebook?: string;
        personal_email?: string;
        company_email?: string;
        company_phone?: string;
        city?: string;
        country?: string;
        industry?: string;
        employees?: string;
        description?: string;
      },
      userId: string
    ) {
      const { last_name, ...rest } = args;
      // A target is a person (last_name) or a company (company) — require one.
      // last_name is a non-null column, so default a company-only target to "".
      if (!last_name && !rest.company) {
        throw new Error("Either last_name or company is required");
      }
      const target = await prismadb.crm_Targets.create({
        data: { last_name: last_name ?? "", ...rest, created_by: userId },
      });
      return itemResponse(target);
    },
  },
  {
    name: "crm_update_target",
    description: "Update an existing CRM target by ID",
    schema: z.object({
      id: z.string().uuid(),
      first_name: z.string().min(1).optional(),
      // fork: allow "" so a mistakenly-named company target can be blanked back
      // to company-only (last_name is a non-null column; "" = "no last name").
      last_name: z.string().optional(),
      email: z.string().email().optional(),
      mobile_phone: z.string().optional(),
      office_phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
      // fork: extended to full CSV-import field parity (lib/spreadsheet/target-fields.ts)
      company_website: z.string().optional(),
      personal_website: z.string().optional(),
      social_linkedin: z.string().optional(),
      social_x: z.string().optional(),
      social_instagram: z.string().optional(),
      social_facebook: z.string().optional(),
      personal_email: z.string().email().optional(),
      company_email: z.string().email().optional(),
      company_phone: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      industry: z.string().optional(),
      employees: z.string().optional(),
      description: z.string().optional(),
    }),
    async handler(
      args: {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        mobile_phone?: string;
        office_phone?: string;
        company?: string;
        position?: string;
        company_website?: string;
        personal_website?: string;
        social_linkedin?: string;
        social_x?: string;
        social_instagram?: string;
        social_facebook?: string;
        personal_email?: string;
        company_email?: string;
        company_phone?: string;
        city?: string;
        country?: string;
        industry?: string;
        employees?: string;
        description?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId, deletedAt: null },
      });
      if (!existing) notFound("Target");
      const { id, ...updateData } = args;
      const target = await prismadb.crm_Targets.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(target);
    },
  },
  {
    name: "crm_delete_target",
    description: "Soft-delete a CRM target by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId, deletedAt: null },
      });
      if (!existing) notFound("Target");
      const target = await prismadb.crm_Targets.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: target.id, deletedAt: target.deletedAt });
    },
  },
];
