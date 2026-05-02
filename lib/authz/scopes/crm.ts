import { prismadb } from "@/lib/prisma";
import { AuthzUser } from "../session";
import { AuthorizationError } from "../errors";

type ContactWhere = NonNullable<
  Parameters<typeof prismadb.crm_Contacts.updateMany>[0]
>["where"];
type TargetWhere = NonNullable<
  Parameters<typeof prismadb.crm_Targets.updateMany>[0]
>["where"];

function contactScopedWhere(user: AuthzUser, contactId: string): ContactWhere {
  if (user.role === "admin" || user.role === "manager") {
    return { id: contactId };
  }
  // user role: own contact (assigned, created_by, or legacy createdBy).
  // TODO(phase-4): include linked account scope (assigned/creator/watcher).
  return {
    id: contactId,
    OR: [
      { assigned_to: user.id },
      { created_by: user.id },
      { createdBy: user.id },
    ],
  };
}

function targetScopedWhere(user: AuthzUser, targetId: string): TargetWhere {
  if (user.role === "admin" || user.role === "manager") {
    return { id: targetId };
  }
  return { id: targetId, created_by: user.id };
}

export async function tryScopedUpdateContact(
  user: AuthzUser,
  contactId: string,
  data: Record<string, string>,
): Promise<boolean> {
  const result = await prismadb.crm_Contacts.updateMany({
    where: contactScopedWhere(user, contactId),
    data: { ...data, updatedBy: user.id },
  });
  return result.count > 0;
}

export async function tryScopedUpdateTarget(
  user: AuthzUser,
  targetId: string,
  data: Record<string, string>,
): Promise<boolean> {
  const result = await prismadb.crm_Targets.updateMany({
    where: targetScopedWhere(user, targetId),
    data: { ...data, updatedBy: user.id },
  });
  return result.count > 0;
}

// Phase B1 write scope helper (kept for assertCanWriteContact).
// Read path now uses contactReadScopeWhere (D2) which adds linked-account scope.
async function findContactInScope(user: AuthzUser, contactId: string) {
  if (user.role === "admin" || user.role === "manager") {
    return prismadb.crm_Contacts.findFirst({
      where: { id: contactId },
      select: { id: true },
    });
  }
  return prismadb.crm_Contacts.findFirst({
    where: {
      id: contactId,
      OR: [
        { assigned_to: user.id },
        { created_by: user.id },
        { createdBy: user.id },
      ],
    },
    select: { id: true },
  });
}

async function findTargetInScope(user: AuthzUser, targetId: string) {
  if (user.role === "admin" || user.role === "manager") {
    return prismadb.crm_Targets.findFirst({
      where: { id: targetId },
      select: { id: true },
    });
  }
  return prismadb.crm_Targets.findFirst({
    where: { id: targetId, created_by: user.id },
    select: { id: true },
  });
}

export async function assertCanReadContact(
  user: AuthzUser,
  contactId: string,
): Promise<void> {
  const row = await prismadb.crm_Contacts.findFirst({
    where: { id: contactId, ...contactReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteContact(
  user: AuthzUser,
  contactId: string,
): Promise<void> {
  const row = await findContactInScope(user, contactId);
  if (!row) throw new AuthorizationError();
}

export async function assertCanReadTarget(
  user: AuthzUser,
  targetId: string,
): Promise<void> {
  const row = await findTargetInScope(user, targetId);
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteTarget(
  user: AuthzUser,
  targetId: string,
): Promise<void> {
  const row = await findTargetInScope(user, targetId);
  if (!row) throw new AuthorizationError();
}

export async function filterAuthorizedContactIds(
  user: AuthzUser,
  contactIds: string[],
): Promise<string[]> {
  if (contactIds.length === 0) return [];
  const baseWhere =
    user.role === "admin" || user.role === "manager"
      ? { id: { in: contactIds } }
      : {
          id: { in: contactIds },
          OR: [
            { assigned_to: user.id },
            { created_by: user.id },
            { createdBy: user.id },
          ],
        };
  const rows = await prismadb.crm_Contacts.findMany({
    where: baseWhere,
    select: { id: true },
  });
  return rows.map((r: { id: string }) => r.id);
}

export async function assertCanCancelContactEnrichment(
  user: AuthzUser,
  enrichmentId: string,
): Promise<void> {
  const row = (await prismadb.crm_Contact_Enrichment.findUnique({
    where: { id: enrichmentId },
    select: { id: true, triggeredBy: true },
  })) as { id: string; triggeredBy: string | null } | null;
  if (!row) throw new AuthorizationError();
  if (user.role === "admin" || user.role === "manager") return;
  if (row.triggeredBy !== user.id) throw new AuthorizationError();
}

export async function assertCanCancelTargetEnrichment(
  user: AuthzUser,
  enrichmentId: string,
): Promise<void> {
  const row = (await prismadb.crm_Target_Enrichment.findUnique({
    where: { id: enrichmentId },
    select: { id: true, triggeredBy: true },
  })) as { id: string; triggeredBy: string | null } | null;
  if (!row) throw new AuthorizationError();
  if (user.role === "admin" || user.role === "manager") return;
  if (row.triggeredBy !== user.id) throw new AuthorizationError();
}

export async function filterAuthorizedTargetIds(
  user: AuthzUser,
  targetIds: string[],
): Promise<string[]> {
  if (targetIds.length === 0) return [];
  const baseWhere =
    user.role === "admin" || user.role === "manager"
      ? { id: { in: targetIds } }
      : { id: { in: targetIds }, created_by: user.id };
  const rows = await prismadb.crm_Targets.findMany({
    where: baseWhere,
    select: { id: true },
  });
  return rows.map((r: { id: string }) => r.id);
}

// Internal: the OR clauses describing user-level account ownership.
// Exported via accountReadScopeWhere; D2 will reuse for nested linked-account scope.
export function accountUserScopeOR(userId: string) {
  return [
    { assigned_to: userId },
    { createdBy: userId },
    { watchers: { some: { user_id: userId } } },
  ];
}

// Build a Prisma where for "this user can read this account".
// Manager/admin: { deletedAt: null }
// User:           { deletedAt: null, OR: accountUserScopeOR(user.id) }
export function accountReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: accountUserScopeOR(user.id),
  };
}

// Throws AuthorizationError if user can't read this account.
export async function assertCanReadAccount(
  user: AuthzUser,
  accountId: string,
): Promise<void> {
  const row = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, ...accountReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteAccount(
  user: AuthzUser,
  accountId: string,
): Promise<void> {
  const where =
    user.role === "admin" || user.role === "manager"
      ? { id: accountId }
      : {
          id: accountId,
          OR: accountUserScopeOR(user.id),
        };
  const row = await prismadb.crm_Accounts.findFirst({
    where,
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

// ---------------------------------------------------------------------------
// D2: Entity read-scope helpers (Lead / Contact / Opportunity / Contract)
// All four reuse accountUserScopeOR for the nested linked-account branch.
// ---------------------------------------------------------------------------

// crm_Leads → crm_Accounts via `assigned_accounts` (FK accountsIDs).
export function leadReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assigned_to: user.id },
      { createdBy: user.id },
      { assigned_accounts: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}

// crm_Contacts → crm_Accounts via `assigned_accounts` (FK accountsIDs).
// Includes legacy created_by + createdBy because both columns exist.
export function contactReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assigned_to: user.id },
      { created_by: user.id },
      { createdBy: user.id },
      { assigned_accounts: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}

// crm_Opportunities → crm_Accounts via `assigned_account` (FK account).
export function opportunityReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assigned_to: user.id },
      { created_by: user.id },
      { createdBy: user.id },
      { assigned_account: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}

// crm_Contracts → crm_Accounts via `assigned_account` (FK account).
export function contractReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assigned_to: user.id },
      { createdBy: user.id },
      { assigned_account: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}

export async function assertCanReadLead(
  user: AuthzUser,
  leadId: string,
): Promise<void> {
  const row = await prismadb.crm_Leads.findFirst({
    where: { id: leadId, ...leadReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

export async function assertCanReadOpportunity(
  user: AuthzUser,
  opportunityId: string,
): Promise<void> {
  const row = await prismadb.crm_Opportunities.findFirst({
    where: { id: opportunityId, ...opportunityReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

export async function assertCanReadContract(
  user: AuthzUser,
  contractId: string,
): Promise<void> {
  const row = await prismadb.crm_Contracts.findFirst({
    where: { id: contractId, ...contractReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

// ---------------------------------------------------------------------------
// D3.T1: Target + Target-list read-scope helpers.
// Both crm_Targets and crm_TargetLists support soft-delete (deletedAt).
// assertCanReadTarget (B1) is reused as-is for the per-row target check.
// ---------------------------------------------------------------------------

export function targetReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") return { deletedAt: null };
  return { deletedAt: null, created_by: user.id };
}

export function targetListReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") return { deletedAt: null };
  return { deletedAt: null, created_by: user.id };
}

export async function assertCanReadTargetList(
  user: AuthzUser,
  listId: string,
): Promise<void> {
  const row = await prismadb.crm_TargetLists.findFirst({
    where: { id: listId, ...targetListReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

// ---------------------------------------------------------------------------
// D3.T3: Activity / audit dispatch helper.
// Resolves an entityType string to the matching assertCanRead* helper.
// Used by activity-feed (T4) and audit-log-by-entity (T5).
// Unknown entity types: managers/admins pass; users are denied.
// ---------------------------------------------------------------------------
export async function assertCanReadActivityForEntity(
  user: AuthzUser,
  entityType: string,
  entityId: string,
): Promise<void> {
  switch (entityType.toLowerCase()) {
    case "account":
      return assertCanReadAccount(user, entityId);
    case "lead":
      return assertCanReadLead(user, entityId);
    case "contact":
      return assertCanReadContact(user, entityId);
    case "opportunity":
      return assertCanReadOpportunity(user, entityId);
    case "contract":
      return assertCanReadContract(user, entityId);
    case "target":
      return assertCanReadTarget(user, entityId);
    case "target_list":
    case "targetlist":
      return assertCanReadTargetList(user, entityId);
    default:
      if (user.role === "user") throw new AuthorizationError();
      return;
  }
}
