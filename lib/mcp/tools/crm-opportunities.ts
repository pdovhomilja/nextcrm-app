import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { opportunityReadScopeWhere } from "@/lib/authz/scopes/crm";
import { createOpportunity, deleteOpportunity, updateOpportunity } from "@/lib/crm/opportunities/service";
import { OpportunityError } from "@/lib/crm/opportunities/types";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  conflict,
} from "../helpers";

// The writes run in lib/crm/opportunities/service.ts, as the server actions do.
// A denied or missing opportunity, parent, assignee or lookup id is NOT_FOUND (no
// existence oracle); the approval gate's refusal is CONFLICT with its reason.
async function mapErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof OpportunityError) {
      if (e.code === "blocked") conflict(e.message);
      notFound("Opportunity");
    }
    throw e;
  }
}

export const crmOpportunityTools = [
  {
    name: "crm_list_opportunity_options",
    description:
      "List the opportunity sales stages (id, name, order, probability, stage_kind) and types (id, name, order) configured in this CRM, for sales_stage_id / type_id. Entering a stage whose stage_kind is \"qualified\" needs an approved quote first",
    schema: z.object({}),
    async handler() {
      // order is nullable and not unique; name keeps the list stable.
      const orderBy = [{ order: "asc" as const }, { name: "asc" as const }];
      const [stages, types] = await Promise.all([
        prismadb.crm_Opportunities_Sales_Stages.findMany({
          select: { id: true, name: true, order: true, probability: true, stage_kind: true },
          orderBy,
        }),
        prismadb.crm_Opportunities_Type.findMany({
          select: { id: true, name: true, order: true },
          orderBy,
        }),
      ]);
      return itemResponse({ stages, types });
    },
  },
  {
    name: "crm_list_opportunities",
    description: "List CRM opportunities visible to the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(
      args: { limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      const where = opportunityReadScopeWhere(user);
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where,
          ...paginationArgs(args),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        prismadb.crm_Opportunities.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_opportunity",
    description: "Get a single CRM opportunity by ID (visible to the authenticated user)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const opp = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, ...opportunityReadScopeWhere(user) },
      });
      if (!opp) notFound("Opportunity");
      return itemResponse(opp);
    },
  },
  {
    name: "crm_search_opportunities",
    description:
      "Search opportunities visible to the authenticated user by name or description (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      // The read scope itself may carry an `OR`; nest the search terms under
      // `AND` so they intersect the scope instead of replacing it.
      const where = {
        ...opportunityReadScopeWhere(user),
        AND: [{ OR: [ilike("name", args.query), ilike("description", args.query)] }],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where,
          ...paginationArgs(args),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
      // Ids from crm_list_opportunity_options.
      sales_stage_id: z.string().uuid().optional(),
      type_id: z.string().uuid().optional(),
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
        sales_stage_id?: string;
        type_id?: string;
      },
      _userId: string,
      user: AuthzUser
    ) {
      const { close_date, sales_stage_id, type_id, ...rest } = args;
      // Assigned to the caller. A new deal has no approved quote, so the gate refuses a qualified stage.
      const opp = await mapErrors(() =>
        createOpportunity(user, {
          ...rest,
          ...(close_date !== undefined && { close_date: new Date(close_date) }),
          ...(sales_stage_id !== undefined && { sales_stage: sales_stage_id }),
          ...(type_id !== undefined && { type: type_id }),
        })
      );
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
      // Pass an id to link, explicit null to unlink. Omit to leave unchanged.
      account: z.string().uuid().nullable().optional(),
      contact: z.string().uuid().nullable().optional(),
      // Reassign the owner. Use crm_list_users to resolve a person to their ID.
      assigned_to: z.string().uuid().nullable().optional(),
      // Ids from crm_list_opportunity_options; null clears the value.
      sales_stage_id: z.string().uuid().nullable().optional(),
      type_id: z.string().uuid().nullable().optional(),
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
        account?: string | null;
        contact?: string | null;
        assigned_to?: string | null;
        sales_stage_id?: string | null;
        type_id?: string | null;
      },
      _userId: string,
      user: AuthzUser
    ) {
      const { id, close_date, sales_stage_id, type_id, ...rest } = args;
      // The web form sets ACTIVE on every save; here only a real stage move does.
      const opp = await mapErrors(() =>
        updateOpportunity(user, id, {
          ...rest,
          ...(close_date !== undefined && { close_date: new Date(close_date) }),
          ...(sales_stage_id !== undefined && { sales_stage: sales_stage_id }),
          ...(type_id !== undefined && { type: type_id }),
        })
      );
      return itemResponse(opp);
    },
  },
  {
    name: "crm_delete_opportunity",
    description: "Soft-delete a CRM opportunity by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const opp = await mapErrors(() => deleteOpportunity(user, args.id));
      return itemResponse({ id: opp.id, deletedAt: opp.deletedAt });
    },
  },
];
