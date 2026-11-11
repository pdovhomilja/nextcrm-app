import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { leadReadScopeWhere } from "@/lib/authz/scopes/crm";
import { createLead, deleteLead, updateLead } from "@/lib/crm/leads/service";
import { LeadError } from "@/lib/crm/leads/types";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
} from "../helpers";

// A denied lead or assignee is NOT_FOUND, like a missing one (no existence oracle).
// Status, source and type ids come from crm_list_lead_options; a wrong one is NOT_FOUND too.
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof LeadError) notFound("Lead");
    throw e;
  }
}

const leadDetailFields = {
  description: z.string().optional(),
  campaign: z.string().optional(),
  refered_by: z.string().optional(),
};

type LeadDetailArgs = {
  description?: string;
  campaign?: string;
  refered_by?: string;
};

export const crmLeadTools = [
  {
    name: "crm_list_lead_options",
    description:
      "List the lead statuses, sources and types configured in this CRM (id + name), for lead_status_id / lead_source_id / lead_type_id",
    schema: z.object({}),
    async handler() {
      const select = { id: true, name: true };
      const orderBy = { name: "asc" as const };
      const [statuses, sources, types] = await Promise.all([
        prismadb.crm_Lead_Statuses.findMany({ select, orderBy }),
        prismadb.crm_Lead_Sources.findMany({ select, orderBy }),
        prismadb.crm_Lead_Types.findMany({ select, orderBy }),
      ]);
      return itemResponse({ statuses, sources, types });
    },
  },
  {
    name: "crm_list_leads",
    description: "List CRM leads visible to the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(
      args: { limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      const where = leadReadScopeWhere(user);
      const [data, total] = await Promise.all([
        prismadb.crm_Leads.findMany({
          where,
          ...paginationArgs(args),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        prismadb.crm_Leads.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_lead",
    description: "Get a single CRM lead by ID (visible to the authenticated user)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const lead = await prismadb.crm_Leads.findFirst({
        where: { id: args.id, ...leadReadScopeWhere(user) },
      });
      if (!lead) notFound("Lead");
      return itemResponse(lead);
    },
  },
  {
    name: "crm_search_leads",
    description:
      "Search leads visible to the authenticated user by name, company, or email (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      // The read scope itself may carry an `OR`; nest the search terms under
      // `AND` so they intersect the scope instead of replacing it.
      const where = {
        ...leadReadScopeWhere(user),
        AND: [
          {
            OR: [
              ilike("firstName", args.query),
              ilike("lastName", args.query),
              ilike("email", args.query),
              ilike("company", args.query),
            ],
          },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Leads.findMany({
          where,
          ...paginationArgs(args),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        prismadb.crm_Leads.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_lead",
    description: "Create a new CRM lead",
    schema: z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
      ...leadDetailFields,
      // Ids from crm_list_lead_options.
      lead_status_id: z.string().uuid().optional(),
      lead_source_id: z.string().uuid().optional(),
      lead_type_id: z.string().uuid().optional(),
    }),
    async handler(
      args: {
        firstName?: string;
        lastName: string;
        email?: string;
        company?: string;
        phone?: string;
        jobTitle?: string;
        lead_status_id?: string;
        lead_source_id?: string;
        lead_type_id?: string;
      } & LeadDetailArgs,
      _userId: string,
      user: AuthzUser
    ) {
      // Always assigned to the caller, so there is nobody else to notify.
      const lead = await guard(() => createLead(user, args));
      return itemResponse(lead);
    },
  },
  {
    name: "crm_update_lead",
    description: "Update an existing CRM lead by ID",
    schema: z.object({
      id: z.string().uuid(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
      // Reassign the owner. Use crm_list_users to resolve a person to their ID.
      assigned_to: z.string().uuid().nullable().optional(),
      ...leadDetailFields,
      // Ids from crm_list_lead_options; null clears the value.
      lead_status_id: z.string().uuid().nullable().optional(),
      lead_source_id: z.string().uuid().nullable().optional(),
      lead_type_id: z.string().uuid().nullable().optional(),
    }),
    async handler(
      args: {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        company?: string;
        phone?: string;
        jobTitle?: string;
        assigned_to?: string | null;
        lead_status_id?: string | null;
        lead_source_id?: string | null;
        lead_type_id?: string | null;
      } & LeadDetailArgs,
      _userId: string,
      user: AuthzUser
    ) {
      const { id, ...input } = args;
      const lead = await guard(() => updateLead(user, id, input));
      return itemResponse(lead);
    },
  },
  {
    name: "crm_delete_lead",
    description: "Soft-delete a CRM lead by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const lead = await guard(() => deleteLead(user, args.id));
      return itemResponse({ id: lead.id, deletedAt: lead.deletedAt });
    },
  },
];
