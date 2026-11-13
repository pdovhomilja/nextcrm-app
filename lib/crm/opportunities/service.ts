import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz/session";
import { AuthorizationError } from "@/lib/authz/errors";
import {
  assertCanWriteAccount,
  assertCanWriteContact,
  assertCanWriteOpportunity,
  assertCanReadCampaign,
  PARTNER_EDIT,
} from "@/lib/authz/scopes/crm";
import { assertAssignableUser } from "@/lib/authz/assignable-user";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import { inngest } from "@/inngest/client";
import sendEmail from "@/lib/sendmail";
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";
import { handleStageTransition } from "@/lib/crm/stage-transition";
import { qualifiedEntryBlockReason } from "@/lib/crm/approval-gate";
import {
  OpportunityError,
  type OpportunityCreateInput,
  type OpportunityInput,
} from "./types";

// Opportunity writes for every caller: server actions and MCP tools. Permission
// checks, the approval gate, the audit log, crm/opportunity.saved and the assignee
// email live here; revalidatePath stays in the actions. There is no
// crm/opportunity.deleted: no listener needs it (reads filter deletedAt, and the
// embedding row is kept so a restore needs no re-embed). The quote approval flow
// (actions/crm/opportunities/approval.ts) stays in its actions: it has no second
// caller to share it with.

async function guard(check: () => Promise<void>) {
  try { await check(); } catch (e) { if (e instanceof AuthorizationError) throw new OpportunityError("forbidden"); throw e; }
}

// Linking to a soft-deleted account or contact is refused like an out-of-scope one,
// so the answer does not tell a deleted row from a foreign one.
async function assertLinkableAccount(user: AuthzUser, accountId: string) {
  const row = await prismadb.crm_Accounts.findFirst({ where: { id: accountId, deletedAt: null }, select: { id: true } });
  if (!row) throw new OpportunityError("forbidden");
  await guard(() => assertCanWriteAccount(user, accountId, PARTNER_EDIT));
}

async function assertLinkableContact(user: AuthzUser, contactId: string) {
  const row = await prismadb.crm_Contacts.findFirst({ where: { id: contactId, deletedAt: null }, select: { id: true } });
  if (!row) throw new OpportunityError("forbidden");
  await guard(() => assertCanWriteContact(user, contactId, PARTNER_EDIT));
}

// Stages and types are rows in admin-managed lookup tables. A wrong id is notFound, not an FK error.
async function assertOpportunityOptions(input: OpportunityInput) {
  if (input.sales_stage && !(await prismadb.crm_Opportunities_Sales_Stages.findUnique({ where: { id: input.sales_stage } })))
    throw new OpportunityError("notFound", "Sales stage");
  if (input.type && !(await prismadb.crm_Opportunities_Type.findUnique({ where: { id: input.type } })))
    throw new OpportunityError("notFound", "Opportunity type");
}

// Spec §3.5: a deal enters a "qualified" stage only with an approved quote.
async function assertStageAllowed(fromStage: string | null, toStage: string | null | undefined, approvalStatus: string) {
  const reason = await qualifiedEntryBlockReason({ fromStage, toStage: toStage ?? null, approvalStatus });
  if (reason) throw new OpportunityError("blocked", reason);
}

// The exchange rate to the default currency at save time, when a currency is set.
async function snapshotRate(currency: string | null | undefined) {
  if (!currency) return {};
  const rate = await getSnapshotRate(currency, await getDefaultCurrency());
  return rate ? { snapshot_rate: parseFloat(rate.toString()) } : {};
}

async function notifyAssignee(opportunity: { id: string; name: string | null }, assigneeId: string) {
  const recipient = await prismadb.users.findFirst({ where: { id: assigneeId } });
  if (!recipient?.email) return;
  const name = opportunity.name ?? "";
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${opportunity.id}`;
  const en = recipient.userLanguage === "en";
  await sendEmail({
    from: process.env.EMAIL_FROM as string,
    to: recipient.email,
    subject: en
      ? `New opportunity ${name} has been added to the system and assigned to you.`
      : `Nová příležitost ${name} byla přidána do systému a přidělena vám.`,
    text: en
      ? `New opportunity ${name} has been added to the system and assigned to you. You can click here for detail: ${url}`
      : `Nová příležitost ${name} byla přidána do systému a přidělena vám. Detaily naleznete zde: ${url}`,
  });
}

function emitSaved(opportunityId: string) {
  void inngest.send({ name: "crm/opportunity.saved", data: { record_id: opportunityId } });
}

// Decimal and BigInt columns, as the audit diff stores them.
const plain = (obj: unknown) =>
  JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

/**
 * Unassigned input goes to the caller. A partner always assigns to himself and must link one of his
 * accounts; a linked contact must be his too. A new deal has no approved quote, so it cannot start in a
 * qualified stage.
 */
export async function createOpportunity(user: AuthzUser, input: OpportunityCreateInput) {
  const partner = user.role === "partner";
  if (partner && !input.account) throw new OpportunityError("forbidden");
  if (input.account) await assertLinkableAccount(user, input.account);
  if (input.contact) await assertLinkableContact(user, input.contact);
  if (input.campaign) { const campaign = input.campaign; await guard(() => assertCanReadCampaign(user, campaign)); }
  const assignee = partner ? user.id : input.assigned_to || user.id;
  if (assignee !== user.id) await guard(() => assertAssignableUser(user, assignee));
  await assertOpportunityOptions(input);
  await assertStageAllowed(null, input.sales_stage, "NONE");
  const opportunity = await prismadb.crm_Opportunities.create({
    data: {
      ...input,
      ...(await snapshotRate(input.currency)),
      assigned_to: assignee,
      createdBy: user.id,
      updatedBy: user.id,
      last_activity_by: user.id,
      stage_entered_at: new Date(),
      status: "ACTIVE",
    },
  });
  await handleStageTransition({ opportunityId: opportunity.id, fromStage: null, toStage: opportunity.sales_stage ?? null });
  if (assignee !== user.id) await notifyAssignee(opportunity, assignee);
  await writeAuditLog({ entityType: "opportunity", entityId: opportunity.id, action: "created", changes: null, userId: user.id });
  emitSaved(opportunity.id);
  return opportunity;
}

/**
 * A new account, contact or campaign link is checked as in createOpportunity; re-sending the stored one (the
 * form sends every field on every save) and unlinking are not. A partner never changes the assignee or
 * unlinks the account, and every contact he sends is checked. Only a new assignee other than the caller is
 * checked and mailed.
 */
export async function updateOpportunity(user: AuthzUser, id: string, input: OpportunityInput) {
  await guard(() => assertCanWriteOpportunity(user, id, PARTNER_EDIT));
  const before = await prismadb.crm_Opportunities.findUnique({ where: { id, deletedAt: null } });
  const partner = user.role === "partner";
  const data = partner ? { ...input, assigned_to: undefined, account: input.account || undefined } : input;
  const { account, contact, campaign, assigned_to } = data;
  if (account && account !== before?.account) await assertLinkableAccount(user, account);
  if (contact && (partner || contact !== before?.contact)) await assertLinkableContact(user, contact);
  if (campaign && campaign !== before?.campaign) await guard(() => assertCanReadCampaign(user, campaign));
  const newAssignee = assigned_to && assigned_to !== before?.assigned_to && assigned_to !== user.id ? assigned_to : null;
  if (newAssignee) await guard(() => assertAssignableUser(user, newAssignee));
  await assertOpportunityOptions(data);
  const fromStage = before?.sales_stage ?? null;
  await assertStageAllowed(fromStage, data.sales_stage, before?.approval_status ?? "NONE");
  const stageMoved = Boolean(data.sales_stage) && data.sales_stage !== fromStage;
  const opportunity = await prismadb.crm_Opportunities.update({
    where: { id },
    data: {
      ...data,
      ...(await snapshotRate(data.currency)),
      ...(stageMoved && { status: "ACTIVE" as const }),
      updatedBy: user.id,
    },
  });
  await handleStageTransition({ opportunityId: id, fromStage, toStage: opportunity.sales_stage ?? null });
  if (newAssignee) await notifyAssignee(opportunity, newAssignee);
  const changes = before ? diffObjects(plain(before), plain(opportunity)) : null;
  await writeAuditLog({ entityType: "opportunity", entityId: id, action: "updated", changes, userId: user.id });
  emitSaved(id);
  return opportunity;
}

/** Soft delete. Partners are refused (no PARTNER_EDIT). */
export async function deleteOpportunity(user: AuthzUser, id: string) {
  await guard(() => assertCanWriteOpportunity(user, id));
  const opportunity = await prismadb.crm_Opportunities.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: user.id } });
  await writeAuditLog({ entityType: "opportunity", entityId: id, action: "deleted", changes: null, userId: user.id });
  return opportunity;
}

/** Admin only. */
export async function restoreOpportunity(user: AuthzUser, id: string) {
  if (user.role !== "admin") throw new OpportunityError("forbidden");
  const opportunity = await prismadb.crm_Opportunities.update({ where: { id }, data: { deletedAt: null, deletedBy: null } });
  await writeAuditLog({ entityType: "opportunity", entityId: id, action: "restored", changes: null, userId: user.id });
  return opportunity;
}
