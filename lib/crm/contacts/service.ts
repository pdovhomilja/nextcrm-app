import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz/session";
import { AuthorizationError } from "@/lib/authz/errors";
import {
  assertCanWriteAccount,
  assertCanWriteContact,
  tryScopedUpdateContact,
  PARTNER_EDIT,
} from "@/lib/authz/scopes/crm";
import { assertAssignableUser } from "@/lib/authz/assignable-user";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import { inngest } from "@/inngest/client";
import sendEmail from "@/lib/sendmail";
import {
  CONTACT_ENRICHMENT_FIELDS,
  CONTACT_FIELDS,
  ContactError,
  type ContactCreateInput,
  type ContactEnrichmentInput,
  type ContactInput,
  type RemoteContactInput,
} from "./types";

// Contact writes for every caller: server actions, MCP tools, the enrichment PATCH
// route and the create-from-remote route. Permission checks, the audit log,
// crm/contact.saved and the assignee email live here; revalidatePath stays in the
// actions. There is no crm/contact.deleted: no listener needs it (reads filter
// deletedAt, and the embedding row is kept so a restore needs no re-embed).
//
// Two writers stay outside: actions/crm/targets/convert-target.ts creates the
// contact inside its own transaction, and inngest/functions/enrich-contact.ts is a
// system job with no user that fills only empty columns.

async function guard(check: () => Promise<void>) {
  try { await check(); } catch (e) { if (e instanceof AuthorizationError) throw new ContactError("forbidden"); throw e; }
}

// Only the columns in ContactInput, whatever else the caller sent.
function fields(input: ContactInput): ContactInput {
  const out: Record<string, unknown> = {};
  for (const key of CONTACT_FIELDS) if (key in input) out[key] = input[key];
  return out as ContactInput;
}

// assertCanWriteContact ignores deletedAt for internal roles, so writes check it here. A soft-deleted contact
// is refused like an out-of-scope one, so the answer does not tell a deleted row from a foreign one.
async function liveContact(id: string) {
  const row = await prismadb.crm_Contacts.findUnique({ where: { id, deletedAt: null } });
  if (!row) throw new ContactError("forbidden");
  return row;
}

// Linking to an account is a write on that account. A soft-deleted account is refused like a foreign one.
async function assertLinkableAccount(user: AuthzUser, accountId: string) {
  const row = await prismadb.crm_Accounts.findFirst({ where: { id: accountId, deletedAt: null }, select: { id: true } });
  if (!row) throw new ContactError("forbidden");
  await guard(() => assertCanWriteAccount(user, accountId, PARTNER_EDIT));
}

async function notifyAssignee(
  contact: { id: string; first_name: string | null; last_name: string },
  assigneeId: string,
) {
  const recipient = await prismadb.users.findFirst({ where: { id: assigneeId } });
  if (!recipient?.email) return;
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/crm/contacts/${contact.id}`;
  const en = recipient.userLanguage === "en";
  await sendEmail({
    from: process.env.EMAIL_FROM as string,
    to: recipient.email,
    subject: en
      ? `New contact ${name} has been added to the system and assigned to you.`
      : `Nový kontakt ${name} byla přidána do systému a přidělena vám.`,
    text: en
      ? `New contact ${name} has been added to the system and assigned to you. You can click here for detail: ${url}`
      : `Nový kontakt ${name} byla přidán do systému a přidělena vám. Detaily naleznete zde: ${url}`,
  });
}

function emitSaved(contactId: string) {
  void inngest.send({ name: "crm/contact.saved", data: { record_id: contactId } });
}

/**
 * Unassigned input goes to the caller; another assignee must be an active user and is mailed. A partner
 * always assigns to himself and must link one of his partner accounts.
 */
export async function createContact(user: AuthzUser, input: ContactCreateInput) {
  const partner = user.role === "partner";
  const data = fields(input) as ContactCreateInput;
  if (partner && !data.accountsIDs) throw new ContactError("forbidden");
  if (data.accountsIDs) await assertLinkableAccount(user, data.accountsIDs);
  const assignee = partner ? user.id : data.assigned_to || user.id;
  if (assignee !== user.id) await guard(() => assertAssignableUser(user, assignee));
  const contact = await prismadb.crm_Contacts.create({
    data: { ...data, v: 0, assigned_to: assignee, createdBy: user.id, updatedBy: user.id },
  });
  if (assignee !== user.id) await notifyAssignee(contact, assignee);
  await writeAuditLog({ entityType: "contact", entityId: contact.id, action: "created", changes: null, userId: user.id });
  emitSaved(contact.id);
  return contact;
}

/** Contacts from the create-from-remote route (NEXTCRM_TOKEN): no signed-in user, so no scope check and no assignee. */
export async function createRemoteContact(input: RemoteContactInput) {
  const { first_name, last_name, email, mobile_phone, tags, notes } = input;
  const contact = await prismadb.crm_Contacts.create({ data: { first_name, last_name, email, mobile_phone, tags, notes } });
  // Marks the row as the remote route's, as createWebLead does for the web form.
  await writeAuditLog({ entityType: "contact", entityId: contact.id, action: "created", changes: [{ field: "remote_form", old: null, new: "create-from-remote" }], userId: null });
  emitSaved(contact.id);
  return contact;
}

/**
 * Linking the contact to another account needs write access to that account, as in createContact; re-saving
 * the current link (the form sends it on every save) and unlinking are not checked. A partner never changes
 * the assignee or unlinks the account. Only a new assignee other than the caller is checked.
 */
export async function updateContact(user: AuthzUser, id: string, input: ContactInput) {
  await guard(() => assertCanWriteContact(user, id, PARTNER_EDIT));
  const before = await liveContact(id);
  const data = fields(input);
  if (user.role === "partner") {
    delete data.assigned_to;
    if (!data.accountsIDs) delete data.accountsIDs;
  }
  const { accountsIDs, assigned_to } = data;
  if (accountsIDs && accountsIDs !== before.accountsIDs) await assertLinkableAccount(user, accountsIDs);
  if (assigned_to && assigned_to !== before.assigned_to && assigned_to !== user.id)
    await guard(() => assertAssignableUser(user, assigned_to));
  const contact = await prismadb.crm_Contacts.update({ where: { id }, data: { ...data, v: 0, updatedBy: user.id } });
  const changes = diffObjects(before as Record<string, unknown>, contact as Record<string, unknown>);
  await writeAuditLog({ entityType: "contact", entityId: id, action: "updated", changes, userId: user.id });
  emitSaved(id);
  return contact;
}

/**
 * The enrichment PATCH route: text columns only. The write is scoped in its own WHERE
 * (tryScopedUpdateContact), so a foreign, missing or soft-deleted contact is notFound.
 */
export async function updateContactFields(user: AuthzUser, id: string, input: ContactEnrichmentInput) {
  const data: Record<string, string> = {};
  for (const key of CONTACT_ENRICHMENT_FIELDS) {
    const value = input[key];
    if (typeof value === "string") data[key] = value;
  }
  const before = await prismadb.crm_Contacts.findUnique({ where: { id, deletedAt: null } });
  if (!before || !(await tryScopedUpdateContact(user, id, data))) throw new ContactError("notFound", "Contact");
  const old = Object.fromEntries(Object.keys(data).map((k) => [k, (before as Record<string, unknown>)[k]]));
  await writeAuditLog({ entityType: "contact", entityId: id, action: "updated", changes: diffObjects(old, data), userId: user.id });
  emitSaved(id);
}

/** Soft delete. Partners are refused (no PARTNER_EDIT). */
export async function deleteContact(user: AuthzUser, id: string) {
  await guard(() => assertCanWriteContact(user, id));
  await liveContact(id);
  const contact = await prismadb.crm_Contacts.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } });
  await writeAuditLog({ entityType: "contact", entityId: id, action: "deleted", changes: null, userId: user.id });
  return contact;
}

/** Admin only. */
export async function restoreContact(user: AuthzUser, id: string) {
  if (user.role !== "admin") throw new ContactError("forbidden");
  const contact = await prismadb.crm_Contacts.update({ where: { id }, data: { deletedAt: null, deletedBy: null } });
  await writeAuditLog({ entityType: "contact", entityId: id, action: "restored", changes: null, userId: user.id });
  return contact;
}
