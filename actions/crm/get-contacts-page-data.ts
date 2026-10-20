import { unstable_cache } from "next/cache";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  accountReadScopeWhere,
  contactReadScopeWhere,
  type AuthzUser,
} from "@/lib/authz";
import { getCachedCrmConfigLookups } from "@/actions/crm/get-crm-data";
import { contactsListTag, accountPickerTag } from "@/lib/server/platform-cache-tags";
import type { AppRole } from "@/lib/authz/roles";

const contactsInclude = {
  assigned_to_user: { select: { name: true } },
  crate_by_user: { select: { name: true } },
  assigned_accounts: true,
  opportunities: {
    include: {
      opportunity: { select: { id: true, name: true } },
    },
  },
  documents: {
    include: {
      document: { select: { id: true, document_name: true } },
    },
  },
} as const;

async function loadContacts(userId: string, role: AppRole) {
  const user: AuthzUser = { id: userId, role };
  return prismadb.crm_Contacts.findMany({
    where: { ...contactReadScopeWhere(user) },
    include: contactsInclude,
  });
}

export function getCachedContactsList(userId: string, role: AppRole) {
  return unstable_cache(
    () => loadContacts(userId, role),
    ["contacts-list-v1", userId, role],
    { revalidate: 90, tags: [contactsListTag(userId, role)] }
  )();
}

async function loadAccountPicker(userId: string, role: AppRole) {
  const user: AuthzUser = { id: userId, role };
  return prismadb.crm_Accounts.findMany({
    where: accountReadScopeWhere(user),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function getCachedAccountPicker(userId: string, role: AppRole) {
  return unstable_cache(
    () => loadAccountPicker(userId, role),
    ["account-picker-v1", userId, role],
    { revalidate: 120, tags: [accountPickerTag(userId, role)] }
  )();
}

/** Contacts page: lookups + accounts for forms + scoped contact rows (no full getAllCrmData). */
export async function getContactsPageData() {
  const user = await requireAuthenticated();
  const [lookups, accounts, contacts] = await Promise.all([
    getCachedCrmConfigLookups(),
    getCachedAccountPicker(user.id, user.role),
    getCachedContactsList(user.id, user.role),
  ]);

  return {
    contacts,
    crmData: {
      ...lookups,
      accounts,
      opportunities: [],
      leads: [],
      contacts: [],
      contracts: [],
      campaigns: [],
    },
  };
}
