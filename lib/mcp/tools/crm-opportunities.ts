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
  assertAssignableUser,
} from "../helpers";

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

export const crmOpportunityTools = [
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
          orderBy: { createdAt: "desc" },
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
      // Pass an id to link, explicit null to unlink. Omit to leave unchanged.
      account: z.string().uuid().nullable().optional(),
      contact: z.string().uuid().nullable().optional(),
      // Reassign the owner. Use crm_list_users to resolve a person to their ID.
      assigned_to: z.string().uuid().nullable().optional(),
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
      if (args.assigned_to) await assertAssignableUser(args.assigned_to);
      const {
        id,
        budget,
        expected_revenue,
        close_date,
        currency,
        account,
        contact,
        assigned_to,
        ...rest
      } = args;
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
          updatedBy: userId,
        },
      });
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
