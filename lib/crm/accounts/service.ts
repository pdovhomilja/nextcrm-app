import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz/session";
import { AuthorizationError } from "@/lib/authz/errors";
import { assertCanWriteAccount, PARTNER_EDIT } from "@/lib/authz/scopes/crm";
import { assertAssignableUser } from "@/lib/authz/assignable-user";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import { inngest } from "@/inngest/client";
import { ACCOUNT_FIELDS, AccountError, type AccountCreateInput, type AccountInput } from "./types";

// Account writes for every caller: server actions and MCP tools. Permission
// checks, the audit log, crm/account.saved and crm/account.deleted live here;
// revalidatePath stays in the actions. crm/account.deleted has no core listener:
// it is the event plugins subscribe to with x.on() (plugin system v0). Restore
// sends no event, as before; the embedding row is kept on delete, so a restore
// needs no re-embed.
//
// The partner, the watchers and the case-study flags keep their own writers
// (set-account-partner.ts, watch-account.ts, unwatch-account.ts, case-study.ts):
// each changes one column under its own role rule and has no second caller.

async function guard(check: () => Promise<void>) {
  try { await check(); } catch (e) { if (e instanceof AuthorizationError) throw new AccountError("forbidden"); throw e; }
}

// Only the columns in AccountInput, whatever else the caller sent.
function fields(input: AccountInput): AccountInput {
  const out: Record<string, unknown> = {};
  for (const key of ACCOUNT_FIELDS) if (key in input) out[key] = input[key];
  return out as AccountInput;
}

// A wrong price list id is notFound, not an FK error.
async function assertPriceList(pricelistId: string | null | undefined) {
  if (pricelistId && !(await prismadb.crm_PriceLists.findUnique({ where: { id: pricelistId }, select: { id: true } })))
    throw new AccountError("notFound", "Price list");
}

// assertCanWriteAccount ignores deletedAt for internal roles, so writes check it here. A soft-deleted account
// is refused like an out-of-scope one, so the answer does not tell a deleted row from a foreign one.
async function liveAccount(id: string) {
  const row = await prismadb.crm_Accounts.findUnique({ where: { id, deletedAt: null } });
  if (!row) throw new AccountError("forbidden");
  return row;
}

function emit(name: "crm/account.saved" | "crm/account.deleted", accountId: string) {
  void inngest.send({ name, data: { record_id: accountId } });
}

/**
 * Unassigned input goes to the caller; another assignee must be an active user. A partner's new account
 * names that partner as its partner and has no internal owner yet, whatever assigned_to says.
 */
export async function createAccount(user: AuthzUser, input: AccountCreateInput) {
  const partner = user.role === "partner";
  const data = fields(input) as AccountCreateInput;
  const assignee = partner ? null : data.assigned_to || user.id;
  if (assignee && assignee !== user.id) await guard(() => assertAssignableUser(user, assignee));
  await assertPriceList(data.pricelist_id);
  const account = await prismadb.crm_Accounts.create({
    data: {
      ...data,
      v: 0,
      assigned_to: assignee,
      // The partner is set only through setAccountPartner (admin/manager), except on a partner's own new account.
      partnerUserId: partner ? user.id : undefined,
      createdBy: user.id,
      updatedBy: user.id,
      status: "Active",
    },
  });
  await writeAuditLog({ entityType: "account", entityId: account.id, action: "created", changes: null, userId: user.id });
  emit("crm/account.saved", account.id);
  return account;
}

/**
 * A partner edits ordinary fields of their own partner accounts only, never the internal owner. A new assignee
 * other than the caller must be an active user; re-sending the stored one (the form sends every field on
 * every save) is not checked, and null unassigns.
 */
export async function updateAccount(user: AuthzUser, id: string, input: AccountInput) {
  await guard(() => assertCanWriteAccount(user, id, PARTNER_EDIT));
  const before = await liveAccount(id);
  const data = fields(input);
  if (user.role === "partner") delete data.assigned_to;
  const { assigned_to } = data;
  if (assigned_to && assigned_to !== before.assigned_to && assigned_to !== user.id)
    await guard(() => assertAssignableUser(user, assigned_to));
  await assertPriceList(data.pricelist_id);
  const account = await prismadb.crm_Accounts.update({ where: { id }, data: { ...data, v: 0, updatedBy: user.id } });
  const changes = diffObjects(before as Record<string, unknown>, account as Record<string, unknown>);
  await writeAuditLog({ entityType: "account", entityId: id, action: "updated", changes, userId: user.id });
  emit("crm/account.saved", id);
  return account;
}

/** Soft delete. Partners are refused (no PARTNER_EDIT). */
export async function deleteAccount(user: AuthzUser, id: string) {
  await guard(() => assertCanWriteAccount(user, id));
  await liveAccount(id);
  const account = await prismadb.crm_Accounts.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } });
  await writeAuditLog({ entityType: "account", entityId: id, action: "deleted", changes: null, userId: user.id });
  emit("crm/account.deleted", id);
  return account;
}

/** Admin only. */
export async function restoreAccount(user: AuthzUser, id: string) {
  if (user.role !== "admin") throw new AccountError("forbidden");
  const account = await prismadb.crm_Accounts.update({ where: { id }, data: { deletedAt: null, deletedBy: null } });
  await writeAuditLog({ entityType: "account", entityId: id, action: "restored", changes: null, userId: user.id });
  return account;
}
