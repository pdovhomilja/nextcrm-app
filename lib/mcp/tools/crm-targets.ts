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
    description:
      "List CRM targets created by the authenticated user. Optionally filter by triage_status (NEW, APPROVED, PASSED).",
    schema: z.object({
      ...paginationSchema,
      triage_status: z.enum(["NEW", "APPROVED", "PASSED"]).optional(),
    }),
    async handler(
      args: { limit: number; offset: number; triage_status?: "NEW" | "APPROVED" | "PASSED" },
      userId: string
    ) {
      const where = {
        created_by: userId,
        deletedAt: null,
        ...(args.triage_status ? { triage_status: args.triage_status } : {}),
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
    description:
      "Create a new CRM target. Accepts the same fields as the CSV import (company_website, industry, city, description, etc.).",
    // Kept at parity with lib/spreadsheet/target-fields.ts (the CSV importable set)
    // so MCP loads carry the same data as an import.
    schema: z.object({
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      mobile_phone: z.string().optional(),
      office_phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
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
        last_name: string;
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
      const target = await prismadb.crm_Targets.create({
        data: { last_name, ...rest, created_by: userId },
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
      last_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile_phone: z.string().optional(),
      office_phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
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
    name: "crm_set_target_triage",
    description:
      "Triage a target: APPROVE it for outreach, or PASS it with a reason (SCOPE_TOO_LARGE, NOT_A_FIT, BAD_TIMING, ALREADY_MODERN, OTHER) and an optional note and revisit_at date. APPROVE clears any prior pass fields.",
    schema: z.object({
      id: z.string().uuid(),
      status: z.enum(["APPROVED", "PASSED"]),
      pass_reason: z
        .enum(["SCOPE_TOO_LARGE", "NOT_A_FIT", "BAD_TIMING", "ALREADY_MODERN", "OTHER"])
        .optional(),
      pass_note: z.string().optional(),
      revisit_at: z.string().datetime().optional(),
    }),
    async handler(
      args: {
        id: string;
        status: "APPROVED" | "PASSED";
        pass_reason?: "SCOPE_TOO_LARGE" | "NOT_A_FIT" | "BAD_TIMING" | "ALREADY_MODERN" | "OTHER";
        pass_note?: string;
        revisit_at?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId, deletedAt: null },
      });
      if (!existing) notFound("Target");
      if (args.status === "PASSED" && !args.pass_reason) {
        throw new Error("pass_reason is required when passing a target");
      }
      const triageData =
        args.status === "APPROVED"
          ? { triage_status: "APPROVED" as const, pass_reason: null, pass_note: null, revisit_at: null }
          : {
              triage_status: "PASSED" as const,
              pass_reason: args.pass_reason ?? null,
              pass_note: args.pass_note ?? null,
              revisit_at: args.revisit_at ? new Date(args.revisit_at) : null,
            };
      const target = await prismadb.crm_Targets.update({
        where: { id: args.id },
        data: { ...triageData, triaged_at: new Date(), triaged_by: userId, updatedBy: userId },
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
