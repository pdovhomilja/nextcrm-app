/**
 * Partner read scope against a real Postgres (partner-role spec § Proof,
 * ticket 2). DB-backed: CI runs it in the integration job.
 *
 * Fixture: partner A, partner B, an internal rep, a `user` with a stale
 * partner link. Accounts: A's, B's, internal-only, A's own company account.
 * Every account gets a contact, lead, opportunity, contract, invoice, order,
 * document, CRM task and activity. The internal account also carries traps:
 * rows A created, is assigned to or watches, and a public document.
 *
 * Expected sets are literal fixture names, not derived from the helpers.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import {
  accountReadScopeWhere,
  contactReadScopeWhere,
  leadReadScopeWhere,
  opportunityReadScopeWhere,
  contractReadScopeWhere,
  documentReadScopeWhere,
  crmTaskReadScopeWhere,
  assertCanReadAccount,
  assertCanReadActivityForEntity,
  assertCanWriteAccount,
  assertCanWriteContact,
  assertCanWriteLead,
  assertCanWriteOpportunity,
  assertCanWriteContract,
  assertCanWriteCrmTask,
  assertCanWriteDocument,
  assertCanWriteActivity,
  PARTNER_EDIT,
} from "@/lib/authz/scopes/crm";
import { orderReadScopeWhere } from "@/lib/authz/scopes/orders";
import { getReportScope } from "@/lib/authz/scopes/report-scope";
import { NO_ROWS } from "@/lib/authz/scopes/unhandled-role";
import { invoiceReadScopeWhere } from "@/lib/invoices/permissions";

const tag = randomUUID().slice(0, 8);
const id = () => randomUUID();

const U = { A: id(), B: id(), rep: id(), stale: id() };
const ACC = { A: id(), B: id(), internal: id(), aOwn: id(), stale: id() };
type AccKey = keyof typeof ACC;
const ACC_KEYS = Object.keys(ACC) as AccKey[];

// name → id, per entity, filled in beforeAll
const ids: Record<string, Record<string, string>> = {
  account: {}, contact: {}, lead: {}, opportunity: {}, contract: {},
  invoice: {}, order: {}, document: {}, task: {}, activity: {},
};

const partnerA: AuthzUser = { id: U.A, role: "partner" };
const partnerB: AuthzUser = { id: U.B, role: "partner" };
const staleUser: AuthzUser = { id: U.stale, role: "user" };

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [
      { id: U.A, email: `a-${tag}@partner.test`, role: "partner" },
      { id: U.B, email: `b-${tag}@partner.test`, role: "partner" },
      { id: U.rep, email: `rep-${tag}@partner.test`, role: "user" },
      { id: U.stale, email: `stale-${tag}@partner.test`, role: "user" },
    ],
  });
  const partnerOf: Partial<Record<AccKey, string>> = { A: U.A, B: U.B, stale: U.stale };
  for (const k of ACC_KEYS) {
    await prismadb.crm_Accounts.create({
      data: {
        id: ACC[k], v: 0, name: `${k}-${tag}`,
        assigned_to: U.rep, createdBy: U.rep,
        partnerUserId: partnerOf[k] ?? null,
      },
    });
    ids.account[k] = ACC[k];
  }
  await prismadb.users.update({ where: { id: U.A }, data: { partnerAccountId: ACC.aOwn } });

  const series = await prismadb.numberSeries.create({
    data: { scope: "order", name: `s-${tag}`, template: `T${tag}-{n}` },
  });
  const currency = (await prismadb.currency.findFirst({ select: { code: true } }))!.code;

  // One of each child per account, owned by the internal rep.
  const child = async (name: string, accountId: string, by = U.rep) => {
    ids.contact[name] = (await prismadb.crm_Contacts.create({
      data: { last_name: name, accountsIDs: accountId, assigned_to: by, createdBy: by },
    })).id;
    ids.lead[name] = (await prismadb.crm_Leads.create({
      data: { lastName: name, accountsIDs: accountId, assigned_to: by, createdBy: by },
    })).id;
    ids.opportunity[name] = (await prismadb.crm_Opportunities.create({
      data: { name, account: accountId, assigned_to: by, createdBy: by },
    })).id;
    ids.contract[name] = (await prismadb.crm_Contracts.create({
      data: { v: 0, title: name, value: 1, account: accountId, assigned_to: by, createdBy: by },
    })).id;
    ids.invoice[name] = (await prismadb.invoices.create({
      data: { accountId, createdBy: by, currency },
    })).id;
    ids.order[name] = (await prismadb.crm_Orders.create({
      data: { number: `${name}-${tag}`, seriesId: series.id, accountId, currency, ownerId: by, createdBy: by },
    })).id;
    ids.document[name] = (await prismadb.documents.create({
      data: {
        document_name: name, document_file_url: "x", document_file_mimeType: "application/pdf",
        created_by_user: by, assigned_user: by,
        accounts: { create: { account_id: accountId } },
      },
    })).id;
    ids.task[name] = (await prismadb.crm_Accounts_Tasks.create({
      data: { v: 0, title: name, priority: "low", account: accountId, createdBy: by, user: by },
    })).id;
    ids.activity[name] = (await prismadb.crm_Activities.create({
      data: {
        type: "note", title: name, date: new Date(), createdBy: by,
        links: { create: { entityType: "account", entityId: accountId } },
      },
    })).id;
  };
  for (const k of ACC_KEYS) await child(k, ACC[k]);

  // Traps on the internal account: A is creator / assignee / watcher.
  await child("trapA", ACC.internal, U.A);
  await prismadb.accountWatchers.create({ data: { account_id: ACC.internal, user_id: U.A } });
  ids.document.public = (await prismadb.documents.create({
    data: {
      document_name: "public", document_file_url: "x", document_file_mimeType: "application/pdf",
      visibility: "public", created_by_user: U.rep,
      accounts: { create: { account_id: ACC.internal } },
    },
  })).id;
  // A document reachable only through a contact on A's account.
  ids.document.viaContactA = (await prismadb.documents.create({
    data: {
      document_name: "viaContactA", document_file_url: "x", document_file_mimeType: "application/pdf",
      created_by_user: U.rep,
      contacts: { create: { contact_id: ids.contact.A } },
    },
  })).id;
});

afterAll(async () => {
  const all = (e: string) => Object.values(ids[e]);
  await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: { in: all("activity") } } });
  await prismadb.crm_Activities.deleteMany({ where: { id: { in: all("activity") } } });
  await prismadb.crm_Accounts_Tasks.deleteMany({ where: { id: { in: all("task") } } });
  await prismadb.documents.deleteMany({ where: { id: { in: all("document") } } });
  await prismadb.crm_Orders.deleteMany({ where: { id: { in: all("order") } } });
  await prismadb.numberSeries.deleteMany({ where: { name: `s-${tag}` } });
  await prismadb.invoices.deleteMany({ where: { id: { in: all("invoice") } } });
  await prismadb.crm_Contracts.deleteMany({ where: { id: { in: all("contract") } } });
  await prismadb.crm_Opportunities.deleteMany({ where: { id: { in: all("opportunity") } } });
  await prismadb.crm_Leads.deleteMany({ where: { id: { in: all("lead") } } });
  await prismadb.crm_Contacts.deleteMany({ where: { id: { in: all("contact") } } });
  await prismadb.users.updateMany({ where: { id: { in: Object.values(U) } }, data: { partnerAccountId: null } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: Object.values(ACC) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

// Run a scope where against the fixture rows only; return the fixture names it matches.
async function visible(entity: string, where: Record<string, unknown>): Promise<string[]> {
  const byId = Object.fromEntries(Object.entries(ids[entity]).map(([n, i]) => [i, n]));
  const delegate = {
    account: prismadb.crm_Accounts, contact: prismadb.crm_Contacts, lead: prismadb.crm_Leads,
    opportunity: prismadb.crm_Opportunities, contract: prismadb.crm_Contracts,
    invoice: prismadb.invoices, order: prismadb.crm_Orders, document: prismadb.documents,
    task: prismadb.crm_Accounts_Tasks,
  }[entity] as unknown as { findMany: (a: unknown) => Promise<{ id: string }[]> };
  const rows = await delegate.findMany({
    where: { AND: [{ id: { in: Object.keys(byId) } }, where] },
    select: { id: true },
  });
  return rows.map((r) => byId[r.id]).sort();
}

const scopes: [string, (u: AuthzUser) => Record<string, unknown>][] = [
  ["account", accountReadScopeWhere],
  ["contact", contactReadScopeWhere],
  ["lead", leadReadScopeWhere],
  ["opportunity", opportunityReadScopeWhere],
  ["contract", contractReadScopeWhere],
  ["invoice", invoiceReadScopeWhere],
  ["order", orderReadScopeWhere],
  ["task", crmTaskReadScopeWhere],
];

// Own company account (Pavel 2026-10-18): the account record, its contacts,
// orders and invoices, read-only. Leads, opportunities, contracts, documents,
// CRM tasks and activities on it stay hidden.
const withOwn: [string, (u: AuthzUser) => Record<string, unknown>][] = scopes.filter(([e]) =>
  ["account", "contact", "invoice", "order"].includes(e));
const partnerOnly: [string, (u: AuthzUser) => Record<string, unknown>][] = scopes.filter(([e]) =>
  ["lead", "opportunity", "contract", "task"].includes(e));

describe("partner A", () => {
  it.each(withOwn)("%s: A's account and his own company account", async (entity, scope) => {
    expect(await visible(entity, scope(partnerA))).toEqual(["A", "aOwn"]);
  });

  it.each(partnerOnly)("%s: A's account only, not his own company account", async (entity, scope) => {
    expect(await visible(entity, scope(partnerA))).toEqual(["A"]);
  });

  it("documents: A's and the one via a contact on A's account; none on his own account, no public or trap document", async () => {
    expect(await visible("document", documentReadScopeWhere(partnerA))).toEqual(["A", "viaContactA"]);
  });

  it("activities: readable on A's account only, refused on his own and the others", async () => {
    const result: Record<string, boolean> = {};
    for (const k of ACC_KEYS) {
      result[k] = await assertCanReadActivityForEntity(partnerA, "account", ACC[k]).then(() => true, () => false);
    }
    expect(result).toEqual({ A: true, aOwn: false, B: false, internal: false, stale: false });
  });

  it("activities on a contact of his own account are refused", async () => {
    await expect(assertCanReadActivityForEntity(partnerA, "contact", ids.contact.aOwn)).rejects.toThrow("Forbidden");
    await expect(assertCanReadActivityForEntity(partnerA, "contact", ids.contact.A)).resolves.toBeUndefined();
  });

  it("report scope gives the same sets; no projects, campaigns or directory", async () => {
    const s = getReportScope(partnerA);
    expect(await visible("account", s.account)).toEqual(["A", "aOwn"]);
    expect(await visible("contact", s.contact)).toEqual(["A", "aOwn"]);
    expect(await visible("lead", s.lead)).toEqual(["A"]);
    expect(await visible("opportunity", s.opportunity)).toEqual(["A"]);
    expect(s.task).toEqual(NO_ROWS);
    expect(s.campaign).toEqual(NO_ROWS);
    expect(s.allowUserDirectory).toBe(false);
  });

  it("own company account: readable, not writable", async () => {
    await expect(assertCanReadAccount(partnerA, ACC.aOwn)).resolves.toBeUndefined();
    await expect(assertCanWriteAccount(partnerA, ACC.aOwn)).rejects.toThrow("Forbidden");
    await expect(assertCanWriteAccount(partnerA, ACC.aOwn, PARTNER_EDIT)).rejects.toThrow("Forbidden");
  });

  it("own company account stays read-only even if he is also named its partner", async () => {
    await prismadb.crm_Accounts.update({ where: { id: ACC.aOwn }, data: { partnerUserId: U.A } });
    try {
      await expect(assertCanWriteAccount(partnerA, ACC.aOwn, PARTNER_EDIT)).rejects.toThrow("Forbidden");
      await expect(assertCanWriteContact(partnerA, ids.contact.aOwn, PARTNER_EDIT)).rejects.toThrow("Forbidden");
    } finally {
      await prismadb.crm_Accounts.update({ where: { id: ACC.aOwn }, data: { partnerUserId: null } });
    }
  });

  it("without the PARTNER_EDIT opt-in every write is refused, even on his partner account", async () => {
    const writes: [string, Promise<void>][] = [
      ["account", assertCanWriteAccount(partnerA, ACC.A)],
      ["contact", assertCanWriteContact(partnerA, ids.contact.A)],
      ["lead", assertCanWriteLead(partnerA, ids.lead.A)],
      ["opportunity", assertCanWriteOpportunity(partnerA, ids.opportunity.A)],
      ["contract", assertCanWriteContract(partnerA, ids.contract.A)],
      ["task", assertCanWriteCrmTask(partnerA, ids.task.A)],
      ["document", assertCanWriteDocument(partnerA, ids.document.A)],
      ["activity", assertCanWriteActivity(partnerA, ids.activity.A)],
    ];
    for (const [name, p] of writes) {
      expect({ name, refused: await p.then(() => false, () => true) }).toEqual({ name, refused: true });
    }
  });

  it("with PARTNER_EDIT: account, contact, lead, opportunity, CRM task, activity on A's account only", async () => {
    const asserts: [string, (id: string) => Promise<void>, Record<string, string>][] = [
      ["account", (i) => assertCanWriteAccount(partnerA, i, PARTNER_EDIT), ids.account],
      ["contact", (i) => assertCanWriteContact(partnerA, i, PARTNER_EDIT), ids.contact],
      ["lead", (i) => assertCanWriteLead(partnerA, i, PARTNER_EDIT), ids.lead],
      ["opportunity", (i) => assertCanWriteOpportunity(partnerA, i, PARTNER_EDIT), ids.opportunity],
      ["task", (i) => assertCanWriteCrmTask(partnerA, i, PARTNER_EDIT), ids.task],
      ["activity", (i) => assertCanWriteActivity(partnerA, i, PARTNER_EDIT), ids.activity],
    ];
    for (const [name, assert, rows] of asserts) {
      const allowed: string[] = [];
      for (const k of [...ACC_KEYS, "trapA"].filter((k) => rows[k])) {
        if (await assert(rows[k]).then(() => true, () => false)) allowed.push(k);
      }
      expect({ name, allowed }).toEqual({ name, allowed: ["A"] });
    }
  });

  it("contracts and documents take no PARTNER_EDIT: refused on his account", async () => {
    await expect(assertCanWriteContract(partnerA, ids.contract.A)).rejects.toThrow("Forbidden");
    await expect(assertCanWriteDocument(partnerA, ids.document.A)).rejects.toThrow("Forbidden");
  });
});

describe("partner B", () => {
  it.each(scopes)("%s: exactly B's account", async (entity, scope) => {
    expect(await visible(entity, scope(partnerB))).toEqual(["B"]);
  });
  it("documents: exactly B's", async () => {
    expect(await visible("document", documentReadScopeWhere(partnerB))).toEqual(["B"]);
  });
});

describe("stale partner link on a non-partner", () => {
  it("a user named as partnerUserId gets nothing from the link", async () => {
    expect(await visible("account", accountReadScopeWhere(staleUser))).toEqual([]);
    expect(await visible("contact", contactReadScopeWhere(staleUser))).toEqual([]);
    expect(await visible("order", orderReadScopeWhere(staleUser))).toEqual([]);
    expect(await visible("invoice", invoiceReadScopeWhere(staleUser))).toEqual([]);
  });
});

describe("an unknown role", () => {
  // visible() wraps the scope in AND: [...]. Prisma reads a bare `OR: []`
  // there as "all rows"; NO_ROWS must still match nothing.
  it("sees nothing, even inside AND", async () => {
    const unknown = { id: U.A, role: "some-future-role" } as unknown as AuthzUser;
    for (const [entity, scope] of scopes) {
      expect({ entity, rows: await visible(entity, scope(unknown)) }).toEqual({ entity, rows: [] });
    }
    expect(await visible("document", documentReadScopeWhere(unknown))).toEqual([]);
  });
});
