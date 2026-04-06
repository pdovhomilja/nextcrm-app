import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  conflict,
} from "../helpers";

export const crmOpportunityTools = [
  {
    name: "crm_list_opportunities",
    description: "List CRM opportunities assigned to the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { assigned_to: userId };
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Opportunities.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_opportunity",
    description: "Get a single CRM opportunity by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const opp = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!opp) notFound("Opportunity");
      return itemResponse(opp);
    },
  },
  {
    name: "crm_search_opportunities",
    description: "Search opportunities by name or description (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        assigned_to: userId,
        OR: [ilike("name", args.query), ilike("description", args.query)],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Opportunities.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_opportunity",
    description: "Create a new CRM opportunity",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      close_date: z.string().datetime().optional(),
      budget: z.number().int().min(0).optional(),
      expected_revenue: z.number().int().min(0).optional(),
      currency: z.string().optional(),
      next_step: z.string().optional(),
    }),
    async handler(
      args: {
        name: string;
        description?: string;
        close_date?: string;
        budget?: number;
        expected_revenue?: number;
        currency?: string;
        next_step?: string;
      },
      userId: string
    ) {
      const { name, budget, expected_revenue, close_date, ...rest } = args;
      const opp = await prismadb.crm_Opportunities.create({
        data: {
          v: 0,
          name,
          ...rest,
          ...(budget !== undefined && { budget }),
          ...(expected_revenue !== undefined && { expected_revenue }),
          ...(close_date !== undefined && { close_date: new Date(close_date) }),
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return itemResponse(opp);
    },
  },
  {
    name: "crm_update_opportunity",
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
      args: {
        id: string;
        name?: string;
        description?: string;
        close_date?: string;
        budget?: number;
        expected_revenue?: number;
        currency?: string;
        next_step?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) notFound("Opportunity");
      const { id, budget, expected_revenue, close_date, currency, ...rest } = args;
      const opp = await prismadb.crm_Opportunities.update({
        where: { id },
        data: {
          ...rest,
          ...(currency !== undefined && { currency }),
          ...(budget !== undefined && { budget }),
          ...(expected_revenue !== undefined && { expected_revenue }),
          ...(close_date !== undefined && { close_date: new Date(close_date) }),
          updatedBy: userId,
        },
      });
      return itemResponse(opp);
    },
  },
  {
    name: "crm_delete_opportunity",
    description: "Soft-delete a CRM opportunity (not yet supported — pending enum migration to add DELETED value)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for Opportunities. Status enum needs DELETED value. See docs/soft-delete-gaps.md");
    },
  },
];
