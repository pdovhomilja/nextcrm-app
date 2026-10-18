/**
 * Partner writes against a real Postgres (partner-role spec § Writes,
 * ticket 4). DB-backed: CI runs it in the integration job.
 *
 * Calls the real server actions and routes with the session mocked; the role
 * comes from the DB. Fixture: partner A (own company account aOwn), partner B,
 * an internal rep. Accounts: A's, B's, internal, aOwn; each with a contact,
 * lead, opportunity, CRM task, activity and document owned by the rep.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock("@/lib/crm/calendar/outbound-emit", () => ({ emitCalendarOutbound: jest.fn(async () => undefined) }));

import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { createTask } from "@/actions/crm/accounts/create-task";
import { deleteTask } from "@/actions/crm/tasks/delete-task";
import { createContact } from "@/actions/crm/contacts/create-contact";
import { updateContact } from "@/actions/crm/contacts/update-contact";
import { deleteContact } from "@/actions/crm/contacts/delete-contact";
import { createLead } from "@/actions/crm/leads/create-lead";
import { updateLead } from "@/actions/crm/leads/update-lead";
import { deleteLead } from "@/actions/crm/leads/delete-lead";
import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
import { deleteOpportunity } from "@/actions/crm/opportunities/delete-opportunity";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { updateActivity } from "@/actions/crm/activities/update-activity";
import { deleteActivity } from "@/actions/crm/activities/delete-activity";
import { bulkDeleteDocuments } from "@/actions/documents/bulk-delete-documents";
import { bulkChangeType } from "@/actions/documents/bulk-change-type";
import { bulkLinkToAccount } from "@/actions/documents/bulk-link-to-account";
import { POST as enrichBulk } from "@/app/api/crm/contacts/enrich-bulk/route";
import { assertAssignableUser } from "@/lib/mcp/helpers";
import { crmDocumentTools } from "@/lib/mcp/tools/crm-documents";

const tag = randomUUID().slice(0, 8);
const id = () => randomUUID();
const U = { A: id(), B: id(), rep: id() };
const ACC = { A: id(), B: id(), internal: id(), aOwn: id() };
type AccKey = keyof typeof ACC;
const ACC_KEYS = Object.keys(ACC) as AccKey[];
const ids: Record<string, Record<string, string>> = {
  contact: {}, lead: {}, opportunity: {}, task: {}, activity: {}, document: {},
};
const created: Record<string, string[]> = { account: [], contact: [], lead: [], opportunity: [], task: [], activity: [] };

const signInAs = (userId: string) =>
  (getSession as jest.Mock).mockResolvedValue({ user: { id: userId, name: "x", userLanguage: "en" } });

const err = (r: unknown) => (r as { error?: string }).error;

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [
      { id: U.A, email: `a-${tag}@partner.test`, role: "partner", userStatus: "ACTIVE" },
      { id: U.B, email: `b-${tag}@partner.test`, role: "partner", userStatus: "ACTIVE" },
      { id: U.rep, email: `rep-${tag}@partner.test`, role: "user", userStatus: "ACTIVE" },
    ],
  });
  const partnerOf: Partial<Record<AccKey, string>> = { A: U.A, B: U.B };
  for (const k of ACC_KEYS) {
    await prismadb.crm_Accounts.create({
      data: { id: ACC[k], v: 0, name: `${k}-${tag}`, assigned_to: U.rep, createdBy: U.rep, partnerUserId: partnerOf[k] ?? null },
    });
  }
  await prismadb.users.update({ where: { id: U.A }, data: { partnerAccountId: ACC.aOwn } });
  for (const k of ACC_KEYS) {
    const by = U.rep;
    ids.contact[k] = (await prismadb.crm_Contacts.create({ data: { last_name: k, accountsIDs: ACC[k], assigned_to: by, createdBy: by } })).id;
    ids.lead[k] = (await prismadb.crm_Leads.create({ data: { lastName: k, accountsIDs: ACC[k], assigned_to: by, createdBy: by } })).id;
    ids.opportunity[k] = (await prismadb.crm_Opportunities.create({ data: { name: k, account: ACC[k], assigned_to: by, createdBy: by } })).id;
    ids.task[k] = (await prismadb.crm_Accounts_Tasks.create({ data: { v: 0, title: k, priority: "low", account: ACC[k], createdBy: by, user: by } })).id;
    ids.activity[k] = (await prismadb.crm_Activities.create({
      data: { type: "note", title: k, date: new Date(), createdBy: by, links: { create: { entityType: "account", entityId: ACC[k] } } },
    })).id;
    ids.document[k] = (await prismadb.documents.create({
      data: {
        document_name: k, document_file_url: "x", document_file_mimeType: "application/pdf",
        created_by_user: by, accounts: { create: { account_id: ACC[k] } },
      },
    })).id;
  }
});

afterAll(async () => {
  const all = (e: string) => [...Object.values(ids[e] ?? {}), ...(created[e] ?? [])];
  await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: { in: all("activity") } } });
  await prismadb.crm_Activities.deleteMany({ where: { id: { in: all("activity") } } });
  await prismadb.crm_Accounts_Tasks.deleteMany({ where: { id: { in: all("task") } } });
  await prismadb.documents.deleteMany({ where: { id: { in: all("document") } } });
  await prismadb.crm_Opportunities.deleteMany({ where: { id: { in: all("opportunity") } } });
  await prismadb.crm_Leads.deleteMany({ where: { id: { in: all("lead") } } });
  await prismadb.crm_Contacts.deleteMany({ where: { id: { in: all("contact") } } });
  await prismadb.users.updateMany({ where: { id: { in: Object.values(U) } }, data: { partnerAccountId: null } });
  await prismadb.crm_AuditLog.deleteMany({ where: { userId: { in: Object.values(U) } } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: [...Object.values(ACC), ...created.account] } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

beforeEach(() => signInAs(U.A));

describe("partner A creates", () => {
  it("an account: he is its partner, it has no internal owner (unowned), assigned_to from the client is ignored", async () => {
    const r = await createAccount({ name: `new-${tag}`, assigned_to: U.rep });
    expect(err(r)).toBeUndefined();
    const row = await prismadb.crm_Accounts.findUniqueOrThrow({ where: { id: (r as { data: { id: string } }).data.id } });
    created.account.push(row.id);
    expect({ partnerUserId: row.partnerUserId, assigned_to: row.assigned_to }).toEqual({ partnerUserId: U.A, assigned_to: null });
  });

  it("a contact, a lead and an opportunity on his account, assigned to himself", async () => {
    const c = await createContact({ last_name: `c-${tag}`, assigned_account: ACC.A, assigned_to: U.rep } as never);
    const l = await createLead({ last_name: `l-${tag}`, accountIDs: ACC.A, assigned_to: U.rep });
    const o = await createOpportunity({ name: `o-${tag}`, account: ACC.A, assigned_to: U.rep });
    for (const r of [c, l, o]) expect(err(r)).toBeUndefined();
    const contact = await prismadb.crm_Contacts.findFirstOrThrow({ where: { last_name: `c-${tag}` } });
    const lead = await prismadb.crm_Leads.findFirstOrThrow({ where: { lastName: `l-${tag}` } });
    const opp = await prismadb.crm_Opportunities.findFirstOrThrow({ where: { name: `o-${tag}` } });
    created.contact.push(contact.id); created.lead.push(lead.id); created.opportunity.push(opp.id);
    expect([
      [contact.accountsIDs, contact.assigned_to],
      [lead.accountsIDs, lead.assigned_to],
      [opp.account, opp.assigned_to],
    ]).toEqual([[ACC.A, U.A], [ACC.A, U.A], [ACC.A, U.A]]);
  });

  it("a CRM task and an activity on his account", async () => {
    const t = await createTask({ title: `t-${tag}`, user: U.rep, priority: "low", content: "x", account: ACC.A });
    expect(err(t)).toBeUndefined();
    const task = await prismadb.crm_Accounts_Tasks.findFirstOrThrow({ where: { title: `t-${tag}` } });
    created.task.push(task.id);
    expect(task.user).toBe(U.A);
    const a = await createActivity({
      type: "note", title: `a-${tag}`, date: new Date(), status: "completed",
      links: [{ entityType: "account", entityId: ACC.A }],
    });
    expect(err(a)).toBeUndefined();
    created.activity.push((a as { data: { id: string } }).data.id);
  });

  it("nothing on his own account, B's or the internal account, and no unlinked records", async () => {
    const refused: Record<string, string | undefined> = {};
    for (const k of ["aOwn", "B", "internal"] as AccKey[]) {
      refused[`contact.${k}`] = err(await createContact({ last_name: "x", assigned_account: ACC[k] } as never));
      refused[`lead.${k}`] = err(await createLead({ last_name: "x", accountIDs: ACC[k] }));
      refused[`opportunity.${k}`] = err(await createOpportunity({ name: "x", account: ACC[k] }));
      refused[`task.${k}`] = err(await createTask({ title: "x", user: U.A, priority: "low", content: "x", account: ACC[k] }));
      refused[`activity.${k}`] = err(await createActivity({
        type: "note", title: "x", date: new Date(), status: "completed",
        links: [{ entityType: "account", entityId: ACC[k] }],
      }));
    }
    refused["contact.none"] = err(await createContact({ last_name: "x" } as never));
    refused["lead.none"] = err(await createLead({ last_name: "x" }));
    refused["opportunity.none"] = err(await createOpportunity({ name: "x" }));
    refused["activity.none"] = err(await createActivity({ type: "note", title: "x", date: new Date(), status: "completed", links: [] }));
    expect(Object.entries(refused).filter(([, e]) => e !== "Forbidden")).toEqual([]);
  });
});

describe("partner A edits", () => {
  it("his account's ordinary fields; assigned_to and partnerUserId stay", async () => {
    const r = await updateAccount({ id: ACC.A, name: `A2-${tag}`, assigned_to: U.A, partnerUserId: U.B } as never);
    expect(err(r)).toBeUndefined();
    const row = await prismadb.crm_Accounts.findUniqueOrThrow({ where: { id: ACC.A } });
    expect({ name: row.name, assigned_to: row.assigned_to, partnerUserId: row.partnerUserId })
      .toEqual({ name: `A2-${tag}`, assigned_to: U.rep, partnerUserId: U.A });
  });

  it("not his own company account, B's or the internal account", async () => {
    const res: Record<string, string | undefined> = {};
    for (const k of ["aOwn", "B", "internal"] as AccKey[]) res[k] = err(await updateAccount({ id: ACC[k], name: "x" } as never));
    expect(res).toEqual({ aOwn: "Forbidden", B: "Forbidden", internal: "Forbidden" });
  });

  it("contact, lead, opportunity on his account; the internal assignee stays", async () => {
    expect(err(await updateContact({ id: ids.contact.A, last_name: "A2", assigned_to: U.A } as never))).toBeUndefined();
    expect(err(await updateLead({ id: ids.lead.A, lastName: "A2", assigned_to: U.A } as never))).toBeUndefined();
    expect(err(await updateOpportunity({ id: ids.opportunity.A, name: "A2", assigned_to: U.A } as never))).toBeUndefined();
    const rows = [
      await prismadb.crm_Contacts.findUniqueOrThrow({ where: { id: ids.contact.A } }),
      await prismadb.crm_Leads.findUniqueOrThrow({ where: { id: ids.lead.A } }),
      await prismadb.crm_Opportunities.findUniqueOrThrow({ where: { id: ids.opportunity.A } }),
    ];
    expect(rows.map((r) => r.assigned_to)).toEqual([U.rep, U.rep, U.rep]);
  });

  it("cannot move a record of his onto another account", async () => {
    expect({
      contact: err(await updateContact({ id: ids.contact.A, last_name: "x", assigned_account: ACC.internal } as never)),
      lead: err(await updateLead({ id: ids.lead.A, lastName: "x", accountIDs: ACC.internal } as never)),
      opportunity: err(await updateOpportunity({ id: ids.opportunity.A, name: "x", account: ACC.internal } as never)),
    }).toEqual({ contact: "Forbidden", lead: "Forbidden", opportunity: "Forbidden" });
    const lead = await prismadb.crm_Leads.findUniqueOrThrow({ where: { id: ids.lead.A } });
    expect(lead.accountsIDs).toBe(ACC.A);
  });

  it("an activity on his account, not one on his own or the internal account", async () => {
    expect(err(await updateActivity({ id: ids.activity.A, title: "A2" }))).toBeUndefined();
    expect(err(await updateActivity({ id: ids.activity.aOwn, title: "x" }))).toBeTruthy();
    expect(err(await updateActivity({ id: ids.activity.internal, title: "x" }))).toBeTruthy();
  });

  it("records on his own company account are read-only", async () => {
    expect({
      contact: err(await updateContact({ id: ids.contact.aOwn, last_name: "x" } as never)),
      lead: err(await updateLead({ id: ids.lead.aOwn, lastName: "x" } as never)),
      opportunity: err(await updateOpportunity({ id: ids.opportunity.aOwn, name: "x" } as never)),
    }).toEqual({ contact: "Forbidden", lead: "Forbidden", opportunity: "Forbidden" });
  });
});

describe("partner A never deletes", () => {
  it("accounts, contacts, leads, opportunities, tasks, activities on his account stay", async () => {
    const results = {
      account: err(await deleteAccount(ACC.A)),
      contact: err(await deleteContact(ids.contact.A)),
      lead: err(await deleteLead(ids.lead.A)),
      opportunity: err(await deleteOpportunity(ids.opportunity.A)),
      task: err(await deleteTask(ids.task.A)),
      activity: err(await deleteActivity(ids.activity.A)),
    };
    expect(Object.values(results).every(Boolean)).toBe(true);
    expect({
      account: (await prismadb.crm_Accounts.findUniqueOrThrow({ where: { id: ACC.A } })).deletedAt,
      contact: (await prismadb.crm_Contacts.findUniqueOrThrow({ where: { id: ids.contact.A } })).deletedAt,
      lead: (await prismadb.crm_Leads.findUniqueOrThrow({ where: { id: ids.lead.A } })).deletedAt,
      opportunity: (await prismadb.crm_Opportunities.findUniqueOrThrow({ where: { id: ids.opportunity.A } })).deletedAt,
      task: !!(await prismadb.crm_Accounts_Tasks.findUnique({ where: { id: ids.task.A } })),
      activity: (await prismadb.crm_Activities.findUniqueOrThrow({ where: { id: ids.activity.A } })).deletedAt,
    }).toEqual({ account: null, contact: null, lead: null, opportunity: null, task: true, activity: null });
  });
});

describe("write paths that used read filters", () => {
  it("documents: bulk delete, change type and link do nothing for a partner, even on his account's document", async () => {
    const refused = async (p: Promise<unknown>) => p.then((r) => err(r) ?? "no error", (e: Error) => e.message);
    expect({
      delete: await refused(bulkDeleteDocuments([ids.document.A])),
      changeType: await refused(bulkChangeType([ids.document.A], "RECEIPT" as never)),
      link: await refused(bulkLinkToAccount([ids.document.A], ACC.A)),
    }).toEqual({ delete: "Unauthenticated", changeType: "Unauthenticated", link: "Unauthenticated" }); // refused centrally: no partner opt-in
    const doc = await prismadb.documents.findUniqueOrThrow({ where: { id: ids.document.A } });
    expect({ deletedAt: doc.deletedAt, type: doc.document_system_type }).toEqual({ deletedAt: null, type: "OTHER" });
  });

  it("contacts enrich-bulk refuses a partner", async () => {
    const req = new NextRequest("http://localhost/api/crm/contacts/enrich-bulk", {
      method: "POST",
      body: JSON.stringify({ contactIds: [ids.contact.A], fields: ["email"] }),
    });
    expect((await enrichBulk(req)).status).toBe(401); // refused centrally: no partner opt-in
  });

  it("MCP document write tools refuse a partner (second line behind getMcpUser)", async () => {
    const partnerA = { id: U.A, role: "partner" as const };
    const args: Record<string, Record<string, unknown>> = {
      crm_create_document: { document_name: "x", contentType: "application/pdf" },
      crm_get_upload_url: { id: ids.document.A },
      crm_link_document: { document_id: ids.document.A, entity_type: "account", entity_id: ACC.A },
      crm_unlink_document: { document_id: ids.document.A, entity_type: "account", entity_id: ACC.A },
      crm_delete_document: { id: ids.document.A },
    };
    const results: Record<string, string> = {};
    for (const [name, a] of Object.entries(args)) {
      const tool = crmDocumentTools.find((t) => t.name === name)!;
      results[name] = await (tool.handler as (...x: unknown[]) => Promise<unknown>)(a, U.A, partnerA)
        .then(() => "allowed", (e: Error) => e.message);
    }
    expect(Object.values(results).every((m) => m.startsWith("FORBIDDEN"))).toBe(true);
  });

  it("assertAssignableUser: a partner assigns only to himself", async () => {
    const partnerA = { id: U.A, role: "partner" as const };
    await expect(assertAssignableUser(U.A, partnerA)).resolves.toBeUndefined();
    await expect(assertAssignableUser(U.rep, partnerA)).rejects.toThrow("NOT_FOUND");
    await expect(assertAssignableUser(U.rep, { id: U.rep, role: "user" })).resolves.toBeUndefined();
  });
});
