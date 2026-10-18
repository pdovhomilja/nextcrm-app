/**
 * Partner leaks closed (partner-role spec, ticket 3). DB-backed: CI runs it
 * in the integration job.
 *
 * The real actions, route and MCP tools are called as partner A (session
 * mocked, role read from the DB as in production). Fixture: partner A,
 * partner B, an internal rep, a colleague (`user`) who only watches A's
 * account. Accounts: A's, B's, internal-only, A's own company account. Each
 * gets a contact, lead, opportunity, contract, invoice, document, CRM task
 * and activity owned by the rep. The internal account carries traps: rows A
 * created / is assigned to, a public document; plus a board, project task and
 * target owned by A.
 *
 * Expected values are literal fixture names and counts.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/inngest/lib/embedding-utils", () => ({
  generateEmbedding: jest.fn(async () => {
    throw new Error("no embeddings in tests");
  }),
  toVectorLiteral: jest.fn(),
}));
jest.mock("@/lib/invoices/storage", () => ({
  getInvoicePdfPresignedUrl: jest.fn(async () => "https://files.test/invoice.pdf"),
}));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getBoardsCount } from "@/actions/dashboard/get-boards-count";
import { getCampaignsCount } from "@/actions/dashboard/get-campaigns-count";
import { getContactCount } from "@/actions/dashboard/get-contacts-count";
import { getContractsCount } from "@/actions/dashboard/get-contracts-count";
import { getDocumentsCount } from "@/actions/dashboard/get-documents-count";
import { getInvoicesCount } from "@/actions/dashboard/get-invoices-count";
import { getLeadsCount } from "@/actions/dashboard/get-leads-count";
import { getOpportunitiesCount } from "@/actions/dashboard/get-opportunities-count";
import { getTargetsCount } from "@/actions/dashboard/get-targets-count";
import { getTasksCount, getUsersTasksCount } from "@/actions/dashboard/get-tasks-count";
import { getStorageSize } from "@/actions/documents/get-storage-size";
import { getExpectedRevenue } from "@/actions/crm/opportunity/get-expected-revenue";
import { getAccountsTasks } from "@/actions/crm/account/get-tasks";
import { getCrMTask } from "@/actions/crm/account/get-task";
import { getUserCRMTasks } from "@/actions/crm/tasks/get-user-tasks";
import { getDocumentsByAccountId } from "@/actions/documents/get-documents-by-accountId";
import { getDocumentsByContactId } from "@/actions/documents/get-documents-by-contactId";
import { getDocumentsByOpportunityId } from "@/actions/documents/get-documents-by-opportunityId";
import { getAccountsByContactId } from "@/actions/crm/get-accounts-by-contactId";
import { getAccountsByOpportunityId } from "@/actions/crm/get-accounts-by-opportunityId";
import { getUserLeads } from "@/actions/crm/get-user-leads";
import { getInvoicesByAccountId } from "@/actions/invoices/get-invoices-by-accountId";
import { searchUsers } from "@/actions/user/search-users";
import { getUsers, getActiveUsers } from "@/actions/get-users";
import { unifiedSearch } from "@/actions/fulltext/unified-search";
import { crmContractTools } from "@/lib/mcp/tools/crm-contracts";
import { crmDocumentTools } from "@/lib/mcp/tools/crm-documents";
import { crmActivityTools } from "@/lib/mcp/tools/crm-activities";
import type { AuthzUser } from "@/lib/authz";
import ContactEnrichmentPage from "@/app/[locale]/(routes)/crm/contacts/enrichment/page";
import TargetEnrichmentPage from "@/app/[locale]/(routes)/campaigns/targets/enrichment/page";
import { GET as getInvoicePdf } from "@/app/api/invoices/[invoiceId]/pdf/route";

const tag = randomUUID().slice(0, 8);
const id = () => randomUUID();

const U = { A: id(), B: id(), rep: id(), colleague: id() };
const ACC = { A: id(), B: id(), internal: id(), aOwn: id() };
type AccKey = keyof typeof ACC;
const ACC_KEYS = Object.keys(ACC) as AccKey[];

const ids: Record<string, Record<string, string>> = {
  contact: {}, lead: {}, contactEnrichment: {}, targetEnrichment: {}, opportunity: {}, contract: {}, invoice: {},
  document: {}, task: {}, activity: {}, board: {}, projectTask: {}, target: {},
};
let currency = "";

const signInAs = (userId: string) =>
  (getSession as jest.Mock).mockResolvedValue({ user: { id: userId } });

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [
      { id: U.A, email: `a-${tag}@partner.test`, name: `A-${tag}`, role: "partner", userStatus: "ACTIVE" },
      { id: U.B, email: `b-${tag}@partner.test`, name: `B-${tag}`, role: "partner", userStatus: "ACTIVE" },
      { id: U.rep, email: `rep-${tag}@partner.test`, name: `rep-${tag}`, role: "user", userStatus: "ACTIVE" },
      { id: U.colleague, email: `col-${tag}@partner.test`, name: `col-${tag}`, role: "user", userStatus: "ACTIVE" },
    ],
  });
  const partnerOf: Partial<Record<AccKey, string>> = { A: U.A, B: U.B };
  for (const k of ACC_KEYS) {
    await prismadb.crm_Accounts.create({
      data: {
        id: ACC[k], v: 0, name: `${k}-${tag}`,
        assigned_to: U.rep, createdBy: U.rep,
        partnerUserId: partnerOf[k] ?? null,
      },
    });
  }
  await prismadb.users.update({ where: { id: U.A }, data: { partnerAccountId: ACC.aOwn } });
  await prismadb.accountWatchers.create({ data: { account_id: ACC.A, user_id: U.colleague } });
  currency = (await prismadb.currency.findFirst({ select: { code: true } }))!.code;

  const child = async (name: string, accountId: string, by = U.rep) => {
    ids.contact[name] = (await prismadb.crm_Contacts.create({
      data: { last_name: `${name}-${tag}`, accountsIDs: accountId, assigned_to: by, createdBy: by },
    })).id;
    ids.lead[name] = (await prismadb.crm_Leads.create({
      data: { lastName: `${name}-${tag}`, accountsIDs: accountId, assigned_to: by, createdBy: by },
    })).id;
    ids.opportunity[name] = (await prismadb.crm_Opportunities.create({
      data: {
        name: `${name}-${tag}`, account: accountId, assigned_to: by, createdBy: by,
        status: "ACTIVE", budget: 100, currency,
      },
    })).id;
    ids.contract[name] = (await prismadb.crm_Contracts.create({
      data: { v: 0, title: `${name}-${tag}`, value: 1, account: accountId, assigned_to: by, createdBy: by },
    })).id;
    ids.invoice[name] = (await prismadb.invoices.create({
      data: { accountId, createdBy: by, currency, pdfStorageKey: `invoices/${name}-${tag}.pdf` },
    })).id;
    ids.document[name] = (await prismadb.documents.create({
      data: {
        document_name: `${name}-${tag}`, document_file_url: "x", document_file_mimeType: "application/pdf",
        size: 1_000_000, created_by_user: by, assigned_user: by,
        accounts: { create: { account_id: accountId } },
      },
    })).id;
    ids.task[name] = (await prismadb.crm_Accounts_Tasks.create({
      data: { v: 0, title: `${name}-${tag}`, priority: "low", account: accountId, createdBy: by, user: by },
    })).id;
    ids.activity[name] = (await prismadb.crm_Activities.create({
      data: {
        type: "note", title: `${name}-${tag}`, date: new Date(), createdBy: by,
        links: { create: { entityType: "account", entityId: accountId } },
      },
    })).id;
  };
  for (const k of ACC_KEYS) await child(k, ACC[k]);

  // Traps: rows A created / is assigned to on the internal account, a public
  // document, and project-side records A owns.
  await child("trapA", ACC.internal, U.A);
  ids.document.public = (await prismadb.documents.create({
    data: {
      document_name: `public-${tag}`, document_file_url: "x", document_file_mimeType: "application/pdf",
      size: 1_000_000, visibility: "public", created_by_user: U.rep,
      accounts: { create: { account_id: ACC.internal } },
    },
  })).id;
  // Linked to A's contact and opportunity only (no account link).
  ids.document.linkedA = (await prismadb.documents.create({
    data: {
      document_name: `linkedA-${tag}`, document_file_url: "x", document_file_mimeType: "application/pdf",
      created_by_user: U.rep,
      contacts: { create: { contact_id: ids.contact.A } },
      opportunities: { create: { opportunity_id: ids.opportunity.A } },
    },
  })).id;
  // A's task carries A's document and the internal public one.
  await prismadb.documentsToCrmAccountsTasks.createMany({
    data: [ids.document.A, ids.document.public].map((d) => ({ document_id: d, crm_accounts_task_id: ids.task.A })),
  });
  for (const k of ["A", "internal"]) {
    ids.contactEnrichment[k] = (await prismadb.crm_Contact_Enrichment.create({
      data: { contactId: ids.contact[k], triggeredBy: U.rep, fields: [] },
    })).id;
  }
  ids.board.A = (await prismadb.boards.create({
    data: { v: 0, title: `board-${tag}`, description: "x", user: U.A, visibility: "public" },
  })).id;
  ids.projectTask.A = (await prismadb.tasks.create({
    data: { v: 0, position: 0, priority: "low", title: `ptask-${tag}`, user: U.A },
  })).id;
  ids.target.A = (await prismadb.crm_Targets.create({
    data: { last_name: `target-${tag}`, created_by: U.A },
  })).id;
  ids.targetEnrichment.A = (await prismadb.crm_Target_Enrichment.create({
    data: { targetId: ids.target.A, triggeredBy: U.A, fields: [] },
  })).id;
});

afterAll(async () => {
  const all = (e: string) => Object.values(ids[e]);
  await prismadb.crm_Contact_Enrichment.deleteMany({ where: { id: { in: all("contactEnrichment") } } });
  await prismadb.crm_Target_Enrichment.deleteMany({ where: { id: { in: all("targetEnrichment") } } });
  await prismadb.crm_Targets.deleteMany({ where: { id: { in: all("target") } } });
  await prismadb.tasks.deleteMany({ where: { id: { in: all("projectTask") } } });
  await prismadb.boards.deleteMany({ where: { id: { in: all("board") } } });
  await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: { in: all("activity") } } });
  await prismadb.crm_Activities.deleteMany({ where: { id: { in: all("activity") } } });
  await prismadb.crm_Accounts_Tasks.deleteMany({ where: { id: { in: all("task") } } });
  await prismadb.documents.deleteMany({ where: { id: { in: all("document") } } });
  await prismadb.invoices.deleteMany({ where: { id: { in: all("invoice") } } });
  await prismadb.crm_Contracts.deleteMany({ where: { id: { in: all("contract") } } });
  await prismadb.crm_Opportunities.deleteMany({ where: { id: { in: all("opportunity") } } });
  await prismadb.crm_Leads.deleteMany({ where: { id: { in: all("lead") } } });
  await prismadb.crm_Contacts.deleteMany({ where: { id: { in: all("contact") } } });
  await prismadb.accountWatchers.deleteMany({ where: { account_id: { in: Object.values(ACC) } } });
  await prismadb.users.updateMany({ where: { id: { in: Object.values(U) } }, data: { partnerAccountId: null } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: Object.values(ACC) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

describe("dashboard as partner A", () => {
  beforeEach(() => signInAs(U.A));

  it("counters are his own counts: A's account, plus his own company account for accounts, contacts and invoices", async () => {
    expect({
      accounts: await getAccountsCount(),
      contacts: await getContactCount(),
      leads: await getLeadsCount(),
      opportunities: await getOpportunitiesCount(),
      contracts: await getContractsCount(),
      documents: await getDocumentsCount(),
      invoices: await getInvoicesCount(),
      storageMB: await getStorageSize(),
      revenue: await getExpectedRevenue(currency),
    }).toEqual({
      accounts: 2, contacts: 2, leads: 1, opportunities: 1, contracts: 1,
      documents: 2, invoices: 2, storageMB: 1, revenue: 100,
    });
  });

  it("no projects, campaigns, targets; the user count is himself", async () => {
    expect({
      boards: await getBoardsCount(),
      projectTasks: await getTasksCount(),
      myProjectTasks: await getUsersTasksCount(U.A),
      campaigns: await getCampaignsCount(),
      targets: await getTargetsCount(),
      users: await getActiveUsersCount(),
    }).toEqual({ boards: 0, projectTasks: 0, myProjectTasks: 0, campaigns: 0, targets: 0, users: 1 });
  });
});

// id → fixture name, for any entity
const nameOf = (rows: { id: string }[]) => {
  const byId = new Map<string, string>();
  for (const [entity, m] of Object.entries(ids)) for (const [n, i] of Object.entries(m)) byId.set(i, `${entity}.${n}`);
  for (const [n, i] of Object.entries(ACC)) byId.set(i, `account.${n}`);
  return rows.map((r) => byId.get(r.id) ?? `foreign:${r.id}`).sort();
};

describe("account-child getters as partner A", () => {
  beforeEach(() => signInAs(U.A));

  it("CRM tasks: only on his accounts, not the trap assigned to him on the internal account", async () => {
    expect(nameOf(await getAccountsTasks(ACC.A))).toEqual(["task.A"]);
    expect(nameOf(await getAccountsTasks(ACC.internal))).toEqual([]);
    const task = await getCrMTask(ids.task.A);
    expect(task?.id).toBe(ids.task.A);
    expect(nameOf(task!.documents.map((d) => d.document))).toEqual(["document.A"]);
    expect(await getCrMTask(ids.task.trapA)).toBeNull();
    expect(nameOf(await getUserCRMTasks(U.A))).toEqual([]);
  });

  it("documents by account / contact / opportunity: his accounts only, no public document", async () => {
    expect(nameOf(await getDocumentsByAccountId(ACC.A))).toEqual(["document.A"]);
    expect(nameOf(await getDocumentsByAccountId(ACC.internal))).toEqual([]);
    expect(nameOf(await getDocumentsByContactId(ids.contact.A))).toEqual(["document.linkedA"]);
    expect(nameOf(await getDocumentsByContactId(ids.contact.trapA))).toEqual([]);
    expect(nameOf(await getDocumentsByOpportunityId(ids.opportunity.A))).toEqual(["document.linkedA"]);
    expect(nameOf(await getDocumentsByOpportunityId(ids.opportunity.trapA))).toEqual([]);
  });

  it("accounts by contact / opportunity: his accounts only", async () => {
    expect(nameOf(await getAccountsByContactId(ids.contact.A))).toEqual(["account.A"]);
    expect(nameOf(await getAccountsByContactId(ids.contact.trapA))).toEqual([]);
    expect(nameOf(await getAccountsByOpportunityId(ids.opportunity.A))).toEqual(["account.A"]);
    expect(nameOf(await getAccountsByOpportunityId(ids.opportunity.trapA))).toEqual([]);
  });

  it("leads assigned to him: none (the only one is on the internal account)", async () => {
    expect(nameOf(await getUserLeads(U.A))).toEqual([]);
  });
});

describe("account-child getters as a user", () => {
  it("a user cannot list another user's leads", async () => {
    signInAs(U.colleague);
    expect(nameOf(await getUserLeads(U.rep))).toEqual([]);
  });
});

describe("invoices", () => {
  const pdf = (invoiceId: string) =>
    getInvoicePdf({} as never, { params: Promise.resolve({ invoiceId }) }).then((r) => r.status);

  it("partner A: invoices of his accounts and their PDFs; nothing on the internal account", async () => {
    signInAs(U.A);
    expect(nameOf(await getInvoicesByAccountId(ACC.A))).toEqual(["invoice.A"]);
    expect(nameOf(await getInvoicesByAccountId(ACC.internal))).toEqual([]);
    expect({ A: await pdf(ids.invoice.A), aOwn: await pdf(ids.invoice.aOwn), internal: await pdf(ids.invoice.internal), B: await pdf(ids.invoice.B) })
      .toEqual({ A: 307, aOwn: 307, internal: 404, B: 404 });
  });

  it("a user who can read the account sees only invoices he created (invoice read scope)", async () => {
    signInAs(U.colleague);
    expect(nameOf(await getInvoicesByAccountId(ACC.A))).toEqual([]);
    expect(await pdf(ids.invoice.A)).toBe(404);
  });
});

describe("user directory and pickers", () => {
  it("partner A finds only himself", async () => {
    signInAs(U.A);
    expect((await searchUsers({ search: tag })).users.map((u) => u.name)).toEqual([`A-${tag}`]);
    expect((await getActiveUsers()).map((u) => u.id)).toEqual([U.A]);
    await expect(getUsers()).rejects.toThrow(); // admin list: no partner opt-in
  });

  it("control: a user still sees his colleagues", async () => {
    signInAs(U.colleague);
    expect((await searchUsers({ search: tag })).users.map((u) => u.name).sort())
      .toEqual([`A-${tag}`, `B-${tag}`, `col-${tag}`, `rep-${tag}`]);
  });
});

describe("unified search", () => {
  const titles = (rows: { title: string }[]) => rows.map((r) => r.title.replace(`-${tag}`, "")).sort();

  it("partner A: refused (no partner opt-in; /fulltext-search is off his routes)", async () => {
    signInAs(U.A);
    expect(await unifiedSearch(tag)).toEqual({ error: "Unauthorized" });
  });

  it("control: a user finds the public board and public document", async () => {
    signInAs(U.colleague);
    const r = await unifiedSearch(tag);
    if ("error" in r) throw new Error(r.error);
    expect({ projects: titles(r.projects), documents: titles(r.documents).includes("public") })
      .toEqual({ projects: ["board"], documents: true });
  });
});

describe("MCP read tools (same scopes as the UI)", () => {
  const tools = [...crmContractTools, ...crmDocumentTools, ...crmActivityTools];
  const run = async (name: string, args: Record<string, unknown>, user: AuthzUser) => {
    const tool = tools.find((t) => t.name === name)!;
    return (tool.handler as any)({ limit: 50, offset: 0, ...args }, user.id, user);
  };
  const listed = async (name: string, args: Record<string, unknown>, user: AuthzUser) =>
    nameOf((await run(name, args, user)).data);
  const found = (name: string, args: Record<string, unknown>, user: AuthzUser) =>
    run(name, args, user).then(() => true, (e) => (e.message === "NOT_FOUND" ? false : Promise.reject(e)));

  const partnerA: AuthzUser = { id: U.A, role: "partner" };
  const colleague: AuthzUser = { id: U.colleague, role: "user" };
  const mine = (names: string[]) => names.filter((n) => !n.startsWith("foreign:"));

  it("contracts: partner A his accounts', a user his readable accounts'; get is scoped", async () => {
    expect(mine(await listed("crm_list_contracts", {}, partnerA))).toEqual(["contract.A"]);
    expect(mine(await listed("crm_list_contracts", {}, colleague))).toEqual(["contract.A"]);
    expect(await found("crm_get_contract", { id: ids.contract.A }, partnerA)).toBe(true);
    expect(await found("crm_get_contract", { id: ids.contract.internal }, partnerA)).toBe(false);
  });

  it("documents: list, get and download use the document read scope", async () => {
    expect(mine(await listed("crm_list_documents", {}, partnerA))).toEqual(["document.A", "document.linkedA"]);
    expect(mine(await listed("crm_list_documents", {}, colleague))).toEqual(["document.A", "document.public"]);
    expect(mine(await listed("crm_list_documents", { entityType: "account", entityId: ACC.A }, partnerA))).toEqual(["document.A"]);
    expect(await found("crm_get_document", { id: ids.document.A }, partnerA)).toBe(true);
    expect(await found("crm_get_document", { id: ids.document.public }, partnerA)).toBe(false);
    expect(await found("crm_get_download_url", { id: ids.document.public }, partnerA)).toBe(false);
  });

  it("activities by entity: everything on a readable entity, refused otherwise", async () => {
    expect(mine(await listed("crm_list_activities", { entityType: "account", entityId: ACC.A }, partnerA))).toEqual(["activity.A"]);
    expect(await found("crm_list_activities", { entityType: "account", entityId: ACC.internal }, partnerA)).toBe(false);
  });
});

describe("enrichment job pages", () => {
  // Jest compiles the pages with the classic JSX runtime.
  beforeAll(() => { (global as unknown as { React: unknown }).React = jest.requireActual("react"); });
  // The rows each page loaded (the page renders them as a table).
  const loaded = async (delegate: { findMany: (...a: never[]) => unknown }, page: () => Promise<unknown>) => {
    const spy = jest.spyOn(delegate, "findMany");
    try {
      await page();
      return nameOf((await spy.mock.results[0].value) as { id: string }[]).filter((n) => !n.startsWith("foreign:"));
    } finally {
      spy.mockRestore();
    }
  };

  it("partner A: refused, the pages load no jobs (no partner opt-in; off his routes)", async () => {
    signInAs(U.A);
    for (const [delegate, page] of [
      [prismadb.crm_Contact_Enrichment, ContactEnrichmentPage],
      [prismadb.crm_Target_Enrichment, TargetEnrichmentPage],
    ] as const) {
      const spy = jest.spyOn(delegate, "findMany");
      await (page as () => Promise<unknown>)().catch(() => undefined);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});
