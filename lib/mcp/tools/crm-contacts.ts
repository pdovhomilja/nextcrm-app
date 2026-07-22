import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import {
  contactReadScopeWhere,
  assertCanWriteContact,
  assertCanWriteAccount,
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

// assertCanWriteContact intentionally ignores deletedAt (the server actions
// guard it separately), so the MCP write path keeps its own soft-delete check.
async function assertWritableContact(user: AuthzUser, contactId: string) {
  const row = await prismadb.crm_Contacts.findFirst({
    where: { id: contactId, deletedAt: null },
    select: { id: true },
  });
  if (!row) notFound("Contact");
  await assertScopeOrNotFound(() => assertCanWriteContact(user, contactId), "Contact");
}

// Relinking a contact to an account is a parent write — mirrors update-contact.ts.
async function assertLinkableAccount(user: AuthzUser, accountId: string) {
  const row = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
    select: { id: true },
  });
  if (!row) notFound("Account");
  await assertScopeOrNotFound(() => assertCanWriteAccount(user, accountId), "Account");
}

export const crmContactTools = [
  {
    name: "crm_list_contacts",
    description: "List CRM contacts visible to the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(
      args: { limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      const where = contactReadScopeWhere(user);
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
    description: "Get a single CRM contact by ID (visible to the authenticated user)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const contact = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, ...contactReadScopeWhere(user) },
      });
      if (!contact) notFound("Contact");
      return itemResponse(contact);
    },
  },
  {
    name: "crm_search_contacts",
    description:
      "Search contacts visible to the authenticated user by name, email, or phone (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      // The read scope itself may carry an `OR`; nest the search terms under
      // `AND` so they intersect the scope instead of replacing it.
      const where = {
        ...contactReadScopeWhere(user),
        AND: [
          {
            OR: [
              ilike("first_name", args.query),
              ilike("last_name", args.query),
              ilike("email", args.query),
              ilike("office_phone", args.query),
              ilike("mobile_phone", args.query),
            ],
          },
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
      // Pass an account id to link, explicit null to unlink. Omit to leave unchanged.
      account: z.string().uuid().nullable().optional(),
      // Reassign the owner. Use crm_list_users to resolve a person to their ID.
      assigned_to: z.string().uuid().nullable().optional(),
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
        account?: string | null;
        assigned_to?: string | null;
      },
      userId: string,
      user: AuthzUser
    ) {
      await assertWritableContact(user, args.id);
      if (args.account) await assertLinkableAccount(user, args.account);
      if (args.assigned_to) await assertAssignableUser(args.assigned_to);
      const { id, account, assigned_to, ...updateData } = args;
      const contact = await prismadb.crm_Contacts.update({
        where: { id },
        data: {
          ...updateData,
          // `accountsIDs` is the real relation FK (crm_Contacts.assigned_accounts);
          // the legacy `account` column carries no relation, so the UI ignores it too.
          ...(account !== undefined && { accountsIDs: account }),
          ...(assigned_to !== undefined && { assigned_to }),
          updatedBy: userId,
        },
      });
      return itemResponse(contact);
    },
  },
  {
    name: "crm_delete_contact",
    description: "Soft-delete a CRM contact by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string, user: AuthzUser) {
      await assertWritableContact(user, args.id);
      const contact = await prismadb.crm_Contacts.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: contact.id, deletedAt: contact.deletedAt });
    },
  },
];
