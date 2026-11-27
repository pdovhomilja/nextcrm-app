import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { contactReadScopeWhere } from "@/lib/authz/scopes/crm";
import { createContact, deleteContact, updateContact } from "@/lib/crm/contacts/service";
import { ContactError } from "@/lib/crm/contacts/types";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
} from "../helpers";

// The writes run in lib/crm/contacts/service.ts, as the server actions do. A
// denied, missing or soft-deleted contact, account or assignee is NOT_FOUND (no
// existence oracle).
async function mapErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ContactError) notFound("Contact");
    throw e;
  }
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
          orderBy: [{ created_on: "desc" }, { id: "desc" }],
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
          orderBy: [{ created_on: "desc" }, { id: "desc" }],
        }),
        prismadb.crm_Contacts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_contact",
    description: "Create a new CRM contact (optionally linked to an account)",
    schema: z.object({
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      office_phone: z.string().optional(),
      mobile_phone: z.string().optional(),
      position: z.string().optional(),
      account: z.string().uuid().optional().describe("Account id to link the new contact to"),
    }),
    async handler(
      args: {
        first_name?: string;
        last_name: string;
        email?: string;
        office_phone?: string;
        mobile_phone?: string;
        position?: string;
        account?: string;
      },
      _userId: string,
      user: AuthzUser
    ) {
      // Assigned to the caller.
      const { account, ...rest } = args;
      const contact = await mapErrors(() =>
        createContact(user, { ...rest, ...(account && { accountsIDs: account }) })
      );
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
      _userId: string,
      user: AuthzUser
    ) {
      const { id, account, ...rest } = args;
      const contact = await mapErrors(() =>
        updateContact(user, id, {
          ...rest,
          // `accountsIDs` is the real relation FK (crm_Contacts.assigned_accounts);
          // the legacy `account` column carries no relation, so the UI ignores it too.
          ...(account !== undefined && { accountsIDs: account }),
        })
      );
      return itemResponse(contact);
    },
  },
  {
    name: "crm_delete_contact",
    description: "Soft-delete a CRM contact by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const contact = await mapErrors(() => deleteContact(user, args.id));
      return itemResponse({ id: contact.id, deletedAt: contact.deletedAt });
    },
  },
];
