/**
 * Vector search skips soft-deleted rows before LIMIT. Embedding rows stay when
 * a record is soft-deleted (restore needs no re-embed), so a deleted record
 * closer to the query vector must not take a result slot from a live one.
 * DB-backed (pgvector): CI runs it in the integration job.
 *
 * Fixture per entity: a live source record on the query vector, one live
 * record slightly off it, and more soft-deleted records than any LIMIT here
 * (10 in unified search, 5 in document search, 5 * 3 in similarity), all of
 * them exactly on the query vector. Only getSession and the embedding call
 * are mocked.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/inngest/lib/embedding-utils", () => ({
  ...jest.requireActual("@/inngest/lib/embedding-utils"),
  generateEmbedding: jest.fn(),
}));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { generateEmbedding } from "@/inngest/lib/embedding-utils";
import { unifiedSearch } from "@/actions/fulltext/unified-search";
import { searchDocuments } from "@/actions/documents/search-documents";
import { getSimilarLeads } from "@/actions/crm/similarity/get-similar-leads";
import { getSimilarAccounts } from "@/actions/crm/similarity/get-similar-accounts";
import { getSimilarContacts } from "@/actions/crm/similarity/get-similar-contacts";
import { getSimilarOpportunities } from "@/actions/crm/similarity/get-similar-opportunities";

const tag = randomUUID().slice(0, 8);
// Manager: sees every live row, no ownership needed. No admin row (other
// suites in the shared CI DB take findFirst({ role: "admin" })).
const U = randomUUID();
const DELETED_AT = new Date("2002-07-01");
const N_DELETED = 16;

// Query vector: one-hot on a random dimension, so embeddings from other
// fixtures (if any) sit far away from it.
const DIM = 1536;
const AXIS = Math.floor(Math.random() * (DIM - 1));
const vec = (offAxis: number) => {
  const v = new Array(DIM).fill(0);
  v[AXIS] = 1;
  v[AXIS + 1] = offAxis;
  return `[${v.join(",")}]`;
};
const ON_QUERY = vec(0);
const NEAR_QUERY = vec(0.2);
const QUERY = `vector probe ${tag}`;

type Kind = "lead" | "account" | "contact" | "opportunity" | "document" | "chunkDocument";
const ids = () => ({ source: randomUUID(), live: randomUUID(), deleted: Array.from({ length: N_DELETED }, () => randomUUID()) });
const IDS: Record<Kind, ReturnType<typeof ids>> = {
  lead: ids(), account: ids(), contact: ids(), opportunity: ids(), document: ids(), chunkDocument: ids(),
};
const name = (kind: Kind, which: string) => `vd-${tag}-${kind}-${which}`;
const LEAD_STATUS = randomUUID();

const createRows: Record<Kind, (rows: { id: string; label: string; deletedAt?: Date }[]) => Promise<unknown>> = {
  lead: (rows) => prismadb.crm_Leads.createMany({
    data: rows.map((r) => ({ id: r.id, lastName: r.label, deletedAt: r.deletedAt, lead_status_id: r.id === IDS.lead.live ? LEAD_STATUS : undefined })),
  }),
  account: (rows) => prismadb.crm_Accounts.createMany({ data: rows.map((r) => ({ id: r.id, v: 0, name: r.label, deletedAt: r.deletedAt })) }),
  contact: (rows) => prismadb.crm_Contacts.createMany({ data: rows.map((r) => ({ id: r.id, last_name: r.label, deletedAt: r.deletedAt })) }),
  opportunity: (rows) => prismadb.crm_Opportunities.createMany({ data: rows.map((r) => ({ id: r.id, name: r.label, deletedAt: r.deletedAt })) }),
  document: (rows) => createDocuments(rows),
  chunkDocument: (rows) => createDocuments(rows),
};
function createDocuments(rows: { id: string; label: string; deletedAt?: Date }[]) {
  return prismadb.documents.createMany({
    data: rows.map((r) => ({
      id: r.id, document_name: r.label, document_file_mimeType: "text/plain",
      document_file_url: `https://files.test/${r.id}`, deletedAt: r.deletedAt,
    })),
  });
}

// Where each kind's vector lives.
const EMBEDDING_SQL: Record<Kind, string> = {
  lead: `INSERT INTO "crm_Embeddings_Leads" (lead_id, embedding, content_hash) VALUES ($1::uuid, $2::vector, 'h')`,
  account: `INSERT INTO "crm_Embeddings_Accounts" (account_id, embedding, content_hash) VALUES ($1::uuid, $2::vector, 'h')`,
  contact: `INSERT INTO "crm_Embeddings_Contacts" (contact_id, embedding, content_hash) VALUES ($1::uuid, $2::vector, 'h')`,
  opportunity: `INSERT INTO "crm_Embeddings_Opportunities" (opportunity_id, embedding, content_hash) VALUES ($1::uuid, $2::vector, 'h')`,
  document: `INSERT INTO "crm_Embeddings_Documents" (document_id, embedding, content_hash) VALUES ($1::uuid, $2::vector, 'h')`,
  chunkDocument: `INSERT INTO "crm_Document_Chunks" (document_id, chunk_index, embedding, chunk_text) VALUES ($1::uuid, 0, $2::vector, 't')`,
};

beforeAll(async () => {
  await prismadb.users.create({
    data: { id: U, email: `vd-${tag}@search.test`, name: `vd-${tag}`, role: "manager", userStatus: "ACTIVE" },
  });
  await prismadb.crm_Lead_Statuses.create({ data: { id: LEAD_STATUS, name: `vd-${tag}-status` } });
  for (const kind of Object.keys(IDS) as Kind[]) {
    const k = IDS[kind];
    await createRows[kind]([
      { id: k.source, label: name(kind, "source") },
      { id: k.live, label: name(kind, "live") },
      ...k.deleted.map((id, i) => ({ id, label: name(kind, `deleted-${i}`), deletedAt: DELETED_AT })),
    ]);
    await prismadb.$executeRawUnsafe(EMBEDDING_SQL[kind], k.source, ON_QUERY);
    await prismadb.$executeRawUnsafe(EMBEDDING_SQL[kind], k.live, NEAR_QUERY);
    for (const id of k.deleted) await prismadb.$executeRawUnsafe(EMBEDDING_SQL[kind], id, ON_QUERY);
  }
});

beforeEach(() => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: U } });
  (generateEmbedding as jest.Mock).mockResolvedValue(JSON.parse(ON_QUERY));
});

afterAll(async () => {
  const all = (kind: Kind) => [IDS[kind].source, IDS[kind].live, ...IDS[kind].deleted];
  const docIds = [...all("document"), ...all("chunkDocument")];
  await prismadb.crm_Embeddings_Leads.deleteMany({ where: { lead_id: { in: all("lead") } } });
  await prismadb.crm_Embeddings_Accounts.deleteMany({ where: { account_id: { in: all("account") } } });
  await prismadb.crm_Embeddings_Contacts.deleteMany({ where: { contact_id: { in: all("contact") } } });
  await prismadb.crm_Embeddings_Opportunities.deleteMany({ where: { opportunity_id: { in: all("opportunity") } } });
  await prismadb.crm_Embeddings_Documents.deleteMany({ where: { document_id: { in: docIds } } });
  await prismadb.crm_Document_Chunks.deleteMany({ where: { document_id: { in: docIds } } });
  await prismadb.crm_Leads.deleteMany({ where: { id: { in: all("lead") } } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: all("account") } } });
  await prismadb.crm_Contacts.deleteMany({ where: { id: { in: all("contact") } } });
  await prismadb.crm_Opportunities.deleteMany({ where: { id: { in: all("opportunity") } } });
  await prismadb.documents.deleteMany({ where: { id: { in: docIds } } });
  await prismadb.crm_Lead_Statuses.deleteMany({ where: { id: LEAD_STATUS } });
  await prismadb.users.deleteMany({ where: { id: U } });
  await prismadb.$disconnect();
});

describe("unified search: semantic results skip soft-deleted rows", () => {
  const search = async () => {
    const res = await unifiedSearch(QUERY);
    if ("error" in res) throw new Error(res.error);
    return res;
  };
  const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

  it("leads", async () => {
    expect(titles((await search()).leads)).toEqual([name("lead", "source"), name("lead", "live")]);
  });
  it("accounts", async () => {
    expect(titles((await search()).accounts)).toEqual([name("account", "source"), name("account", "live")]);
  });
  it("contacts", async () => {
    expect(titles((await search()).contacts)).toEqual([name("contact", "source"), name("contact", "live")]);
  });
  it("opportunities", async () => {
    expect(titles((await search()).opportunities)).toEqual([name("opportunity", "source"), name("opportunity", "live")]);
  });
  it("documents (document embeddings)", async () => {
    expect(titles((await search()).documents)).toEqual(
      expect.arrayContaining([name("document", "source"), name("document", "live")]),
    );
  });
  it("documents (chunk embeddings)", async () => {
    expect(titles((await search()).documents)).toEqual(
      expect.arrayContaining([name("chunkDocument", "source"), name("chunkDocument", "live")]),
    );
  });
});

describe("document search: semantic results skip soft-deleted documents", () => {
  it("finds the live document behind closer soft-deleted ones", async () => {
    const res = await searchDocuments(QUERY);
    expect(res.map((r) => r.name)).toEqual([name("document", "source"), name("document", "live")]);
  });
});

describe("similar records skip soft-deleted rows", () => {
  const records = async (p: ReturnType<typeof getSimilarLeads>) => {
    const res = await p;
    if (res.status !== "ok") throw new Error(res.status === "error" ? res.message : res.status);
    return res.records;
  };

  it("leads (with the lead status name as subtitle)", async () => {
    const rows = await records(getSimilarLeads(IDS.lead.source));
    expect(rows.map((r) => [r.name, r.subtitle])).toEqual([[name("lead", "live"), `vd-${tag}-status`]]);
  });
  it("accounts", async () => {
    const rows = await records(getSimilarAccounts(IDS.account.source));
    expect(rows.map((r) => r.name)).toEqual([name("account", "live")]);
  });
  it("contacts", async () => {
    const rows = await records(getSimilarContacts(IDS.contact.source));
    expect(rows.map((r) => r.name)).toEqual([name("contact", "live")]);
  });
  it("opportunities", async () => {
    const rows = await records(getSimilarOpportunities(IDS.opportunity.source));
    expect(rows.map((r) => r.name)).toEqual([name("opportunity", "live")]);
  });
});
