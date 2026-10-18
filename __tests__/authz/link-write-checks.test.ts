/**
 * Linking needs write access to the target record (all roles). DB-backed: CI
 * runs it in the integration job.
 *
 * Fixture: two internal users (`rep`, `other`), each owning one account and
 * one lead; `rep` owns a document. The real createActivity action and the
 * real MCP crm_link_document tool are called as `rep` (session mocked, role
 * read from the DB as in production).
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/crm/calendar/outbound-emit", () => ({ emitCalendarOutbound: jest.fn() }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { crmDocumentTools } from "@/lib/mcp/tools/crm-documents";
import type { AuthzUser } from "@/lib/authz";

const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), other: randomUUID() };
const ACC = { rep: randomUUID(), other: randomUUID() };
const LEAD = { rep: randomUUID(), other: randomUUID() };
const DOC = randomUUID();
const rep: AuthzUser = { id: U.rep, role: "user" };

const note = (links: Array<{ entityType: string; entityId: string }>) =>
  createActivity({ type: "note", title: `note-${tag}`, date: new Date(), status: "completed", links });

const linkDocument = (entityType: string, entityId: string) => {
  const tool = crmDocumentTools.find((t) => t.name === "crm_link_document")!;
  return (tool.handler as any)({ document_id: DOC, entityType, entityId }, rep.id, rep);
};

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [
      { id: U.rep, email: `rep-${tag}@link.test`, name: `rep-${tag}`, role: "user", userStatus: "ACTIVE" },
      { id: U.other, email: `other-${tag}@link.test`, name: `other-${tag}`, role: "user", userStatus: "ACTIVE" },
    ],
  });
  for (const k of ["rep", "other"] as const) {
    await prismadb.crm_Accounts.create({
      data: { id: ACC[k], v: 0, name: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
    await prismadb.crm_Leads.create({
      data: { id: LEAD[k], lastName: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
  }
  await prismadb.documents.create({
    data: {
      id: DOC, document_name: `doc-${tag}`, document_file_url: "x", document_file_mimeType: "application/pdf",
      created_by_user: U.rep, assigned_user: U.rep,
    },
  });
  (getSession as jest.Mock).mockResolvedValue({ user: { id: U.rep } });
});

afterAll(async () => {
  const activities = await prismadb.crm_Activities.findMany({ where: { title: `note-${tag}` }, select: { id: true } });
  const activityIds = activities.map((a) => a.id);
  await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: { in: activityIds } } });
  await prismadb.crm_Activities.deleteMany({ where: { id: { in: activityIds } } });
  await prismadb.documentsToAccounts.deleteMany({ where: { document_id: DOC } });
  await prismadb.documentsToLeads.deleteMany({ where: { document_id: DOC } });
  await prismadb.documents.deleteMany({ where: { id: DOC } });
  await prismadb.crm_Leads.deleteMany({ where: { id: { in: Object.values(LEAD) } } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: Object.values(ACC) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

describe("createActivity links", () => {
  it("refuses a link to an account the user cannot write, and creates nothing", async () => {
    expect(await note([{ entityType: "account", entityId: ACC.other }])).toEqual({ error: "Forbidden" });
    expect(await prismadb.crm_Activities.count({ where: { title: `note-${tag}` } })).toBe(0);
  });

  it("refuses when any one of several links is not writable", async () => {
    expect(
      await note([
        { entityType: "account", entityId: ACC.rep },
        { entityType: "lead", entityId: LEAD.other },
      ]),
    ).toEqual({ error: "Forbidden" });
  });

  it("refuses an unknown entity type", async () => {
    expect(await note([{ entityType: "invoice", entityId: ACC.rep }])).toEqual({ error: "Forbidden" });
  });

  it("still links to the user's own account and lead", async () => {
    const result = await note([
      { entityType: "account", entityId: ACC.rep },
      { entityType: "lead", entityId: LEAD.rep },
    ]);
    expect(result.error).toBeUndefined();
    expect(result.data.links.map((l: { entityId: string }) => l.entityId).sort()).toEqual(
      [ACC.rep, LEAD.rep].sort(),
    );
  });
});

