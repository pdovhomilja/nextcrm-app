import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import {
  opportunityReadScopeWhere,
  assertCanWriteOpportunity,
  assertCanWriteAccount,
  assertCanWriteContact,
} from "@/lib/authz/scopes/crm";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  softDeleteData,
  assertScopeOrNotFound,
  conflict,
} from "../helpers";
import { assertAssignableUser } from "@/lib/authz/assignable-user";
import { inngest } from "@/inngest/client";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import { handleStageTransition } from "@/lib/crm/stage-transition";
import { qualifiedEntryBlockReason } from "@/lib/crm/approval-gate";

// Relinking an opportunity to an account/contact is a parent write: the row must
// exist, must not be soft-deleted, and the caller must be allowed to write it.
// Mirrors create-opportunity.ts / update-contact.ts, which assert the same way.
async function assertLinkableAccount(user: AuthzUser, accountId: string) {
  const row = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
    select: { id: true },
  });
  if (!row) notFound("Account");
  await assertScopeOrNotFound(() => assertCanWriteAccount(user, accountId), "Account");
}

async function assertLinkableContact(user: AuthzUser, contactId: string) {
  const row = await prismadb.crm_Contacts.findFirst({
    where: { id: contactId, deletedAt: null },
    select: { id: true },
  });
  if (!row) notFound("Contact");
  await assertScopeOrNotFound(() => assertCanWriteContact(user, contactId), "Contact");
}

// Stages and types are rows in admin-managed lookup tables; agents read their ids
// with crm_list_opportunity_options. A wrong id is NOT_FOUND, not an FK error.
async function assertOpportunityOptions(args: {
  sales_stage_id?: string | null;
  type_id?: string | null;
}) {
  if (
    args.sales_stage_id &&
    !(await prismadb.crm_Opportunities_Sales_Stages.findUnique({ where: { id: args.sales_stage_id } }))
  )
    notFound("Sales stage");
  if (args.type_id && !(await prismadb.crm_Opportunities_Type.findUnique({ where: { id: args.type_id } })))
    notFound("Opportunity type");
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
      userId: string
    ) {
      await assertOpportunityOptions(args);
      const { name, budget, expected_revenue, close_date, sales_stage_id, type_id, ...rest } = args;
      // A new deal has no approved quote, so the gate refuses a qualified stage here.
      const blockReason = await qualifiedEntryBlockReason({
        fromStage: null,
        toStage: sales_stage_id ?? null,
        approvalStatus: "NONE",
      });
      if (blockReason) conflict(blockReason);
      const opp = await prismadb.crm_Opportunities.create({
        data: {
          v: 0,
          name,
          ...rest,
          ...(budget !== undefined && { budget }),
          ...(expected_revenue !== undefined && { expected_revenue }),
          ...(close_date !== undefined && { close_date: new Date(close_date) }),
          ...(sales_stage_id !== undefined && { sales_stage: sales_stage_id }),
          ...(type_id !== undefined && { type: type_id }),
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      await handleStageTransition({
        opportunityId: opp.id,
        fromStage: null,
        toStage: opp.sales_stage ?? null,
      });
      await writeAuditLog({
        entityType: "opportunity",
        entityId: opp.id,
        action: "created",
        changes: null,
        userId,
      });
      void inngest.send({ name: "crm/opportunity.saved", data: { record_id: opp.id } });
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
      userId: string,
      user: AuthzUser
    ) {
      await assertScopeOrNotFound(
        () => assertCanWriteOpportunity(user, args.id),
        "Opportunity"
      );
      if (args.account) await assertLinkableAccount(user, args.account);
      if (args.contact) await assertLinkableContact(user, args.contact);
      const assignee = args.assigned_to;
      if (assignee) await assertScopeOrNotFound(() => assertAssignableUser(user, assignee), "User");
      await assertOpportunityOptions(args);
      const {
        id,
        budget,
        expected_revenue,
        close_date,
        currency,
        account,
        contact,
        assigned_to,
        sales_stage_id,
        type_id,
        ...rest
      } = args;
      const before = await prismadb.crm_Opportunities.findUnique({ where: { id } });
      const fromStage = before?.sales_stage ?? null;
      const blockReason = await qualifiedEntryBlockReason({
        fromStage,
        toStage: sales_stage_id ?? null,
        approvalStatus: before?.approval_status ?? "NONE",
      });
      if (blockReason) conflict(blockReason);
      // The web form sets ACTIVE on every save; here only a real stage move does.
      const stageMoved = Boolean(sales_stage_id) && sales_stage_id !== fromStage;
      const opp = await prismadb.crm_Opportunities.update({
        where: { id },
        data: {
          ...rest,
          ...(currency !== undefined && { currency }),
          ...(budget !== undefined && { budget }),
          ...(expected_revenue !== undefined && { expected_revenue }),
          ...(close_date !== undefined && { close_date: new Date(close_date) }),
          ...(account !== undefined && { account }),
          ...(contact !== undefined && { contact }),
          ...(assigned_to !== undefined && { assigned_to }),
          ...(sales_stage_id !== undefined && { sales_stage: sales_stage_id }),
          ...(type_id !== undefined && { type: type_id }),
          ...(stageMoved && { status: "ACTIVE" as const }),
          updatedBy: userId,
        },
      });
      await handleStageTransition({
        opportunityId: id,
        fromStage,
        toStage: opp.sales_stage ?? null,
      });
      const serialize = (obj: unknown) =>
        JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
      await writeAuditLog({
        entityType: "opportunity",
        entityId: id,
        action: "updated",
        changes: before ? diffObjects(serialize(before), serialize(opp)) : null,
        userId,
      });
      void inngest.send({ name: "crm/opportunity.saved", data: { record_id: id } });
      return itemResponse(opp);
    },
  },
  {
    name: "crm_delete_opportunity",
    description: "Soft-delete a CRM opportunity by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(
        () => assertCanWriteOpportunity(user, args.id),
        "Opportunity"
      );
      const opp = await prismadb.crm_Opportunities.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: opp.id, deletedAt: opp.deletedAt });
    },
  },
];
