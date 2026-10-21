import { unstable_cache } from "next/cache";
import {
  requireAuthenticated,
  documentReadScopeWhere,
  accountReadScopeWhere,
  type AuthzUser,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import {
  documentsListTag,
  accountPickerTag,
} from "@/lib/server/platform-cache-tags";
import type { AppRole } from "@/lib/authz/roles";

async function loadDocuments(userId: string, role: AppRole) {
  const user: AuthzUser = { id: userId, role };
  return prismadb.documents.findMany({
    where: {
      parent_document_id: null,
      ...documentReadScopeWhere(user),
    },
    orderBy: { date_created: "desc" },
    include: {
      created_by: { select: { id: true, name: true, email: true } },
      assigned_to_user: { select: { id: true, name: true, email: true } },
      accounts: {
        select: {
          account: { select: { id: true, name: true } },
        },
      },
    },
  });
}

function getCachedDocumentsList(userId: string, role: AppRole) {
  return unstable_cache(
    () => loadDocuments(userId, role),
    ["documents-list-v1", userId, role],
    { revalidate: 90, tags: [documentsListTag(userId, role)] }
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

function getCachedAccountPicker(userId: string, role: AppRole) {
  return unstable_cache(
    () => loadAccountPicker(userId, role),
    ["documents-account-picker-v1", userId, role],
    { revalidate: 120, tags: [accountPickerTag(userId, role)] }
  )();
}

export async function getDocumentsPageData() {
  const user = await requireAuthenticated();
  const [documents, accounts] = await Promise.all([
    getCachedDocumentsList(user.id, user.role),
    getCachedAccountPicker(user.id, user.role),
  ]);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  return { documents, accountOptions };
}
