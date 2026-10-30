/**
 * Server actions that take a record id check write scope before they write
 * (Sentinel N1). DB-backed: CI runs it in the integration job.
 *
 * Fixture: two plain users (`rep`, `other`) and a `boss` (manager), each
 * user with his own opportunity, account, project task and document. Each
 * action is called as `rep` with `other`'s record (refused with the same
 * error as a missing id, nothing written), as `rep` with his own (allowed)
 * and as `boss` with `other`'s (allowed). The session is mocked; the role
 * comes from the DB.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const send = jest.fn();
jest.mock("@/lib/resend", () => ({ __esModule: true, default: async () => ({ emails: { send } }) }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { requestApproval } from "@/actions/crm/opportunities/approval";
import { setCaseStudyCandidate } from "@/actions/crm/accounts/case-study";
import { disconnectDocumentFromTask } from "@/actions/projects/assign-document-to-task";

const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), other: randomUUID(), boss: randomUUID() };
const OPP = { rep: randomUUID(), other: randomUUID(), boss: randomUUID() };
const ACC = { rep: randomUUID(), other: randomUUID() };
const BOARD = { rep: randomUUID(), other: randomUUID() };
const TASK = { rep: randomUUID(), other: randomUUID() };
const DOC = { rep: randomUUID(), other: randomUUID() };

const as = (who: keyof typeof U) => (getSession as jest.Mock).mockResolvedValue({ user: { id: U[who] } });

beforeAll(async () => {
  await prismadb.users.createMany({
    data: (["rep", "other", "boss"] as const).map((k) => ({
      id: U[k], email: `${k}-${tag}@action-scope.test`, name: `${k}-${tag}`,
      role: k === "boss" ? "manager" : "user", userStatus: "ACTIVE",
    })),
  });
  for (const k of ["rep", "other"] as const) {
    await prismadb.crm_Opportunities.create({
      data: { id: OPP[k], name: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
  }
  for (const k of ["rep", "other"] as const) {
    // other's account carries a manager's case-study approval
    await prismadb.crm_Accounts.create({
      data: {
        id: ACC[k], v: 0, name: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k],
        case_study_candidate: k === "other", case_study_approved: k === "other",
      },
    });
  }
  for (const k of ["rep", "other"] as const) {
    await prismadb.boards.create({ data: { id: BOARD[k], v: 0, title: `${k}-${tag}`, description: "x", user: U[k] } });
    const section = await prismadb.sections.create({ data: { v: 0, board: BOARD[k], title: `${k}-${tag}` } });
    await prismadb.tasks.create({
      data: { id: TASK[k], v: 0, position: 0, priority: "low", title: `${k}-${tag}`, user: U[k], section: section.id },
    });
    await prismadb.documents.create({
      data: {
        id: DOC[k], document_name: `${k}-${tag}`, document_file_url: "x", document_file_mimeType: "application/pdf",
        created_by_user: U[k], assigned_user: U[k],
      },
    });
  }
  // rep's task has his own document and (put there by a manager) other's private one
  await prismadb.documentsToTasks.createMany({
    data: [
      { task_id: TASK.rep, document_id: DOC.rep },
      { task_id: TASK.rep, document_id: DOC.other },
      { task_id: TASK.other, document_id: DOC.other },
    ],
  });
  // a second deal of other's, for the manager case
  await prismadb.crm_Opportunities.create({
    data: { id: OPP.boss, name: `boss-${tag}`, assigned_to: U.other, createdBy: U.other },
  });
});

afterAll(async () => {
  await prismadb.crm_Opportunities.deleteMany({ where: { id: { in: Object.values(OPP) } } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: Object.values(ACC) } } });
  await prismadb.tasks.deleteMany({ where: { id: { in: Object.values(TASK) } } });
  await prismadb.sections.deleteMany({ where: { board: { in: Object.values(BOARD) } } });
  await prismadb.boards.deleteMany({ where: { id: { in: Object.values(BOARD) } } });
  await prismadb.documents.deleteMany({ where: { id: { in: Object.values(DOC) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

beforeEach(() => send.mockClear());

describe("requestApproval", () => {
  const status = async (id: string) =>
    (await prismadb.crm_Opportunities.findUnique({ where: { id }, select: { approval_status: true } }))!.approval_status;

  it("user gets 'not found' for another user's deal, same as a missing id; nothing written, no email", async () => {
    as("rep");
    expect(await requestApproval(randomUUID())).toEqual({ error: "Opportunity not found" });
    expect(await requestApproval(OPP.other)).toEqual({ error: "Opportunity not found" });
    expect(await status(OPP.other)).toBe("NONE");
    expect(send).not.toHaveBeenCalled();
  });

  it("own deal as user, another user's deal as manager", async () => {
    as("rep");
    expect(await requestApproval(OPP.rep)).toEqual({});
    expect(await status(OPP.rep)).toBe("PENDING");
    expect(send).toHaveBeenCalledTimes(1);
    as("boss");
    expect(await requestApproval(OPP.boss)).toEqual({});
    expect(await status(OPP.boss)).toBe("PENDING");
  });
});

describe("setCaseStudyCandidate", () => {
  const flags = async (id: string) =>
    await prismadb.crm_Accounts.findUnique({
      where: { id }, select: { case_study_candidate: true, case_study_approved: true },
    });

  it("user gets 'not found' for another user's account, same as a missing id; approval stays", async () => {
    as("rep");
    expect(await setCaseStudyCandidate(randomUUID(), false)).toEqual({ error: "Account not found" });
    expect(await setCaseStudyCandidate(ACC.other, false)).toEqual({ error: "Account not found" });
    expect(await flags(ACC.other)).toEqual({ case_study_candidate: true, case_study_approved: true });
  });

  it("own account as user, another user's account as manager", async () => {
    as("rep");
    expect(await setCaseStudyCandidate(ACC.rep, true)).toEqual({});
    expect(await flags(ACC.rep)).toEqual({ case_study_candidate: true, case_study_approved: false });
    as("boss");
    expect(await setCaseStudyCandidate(ACC.other, false)).toEqual({});
    expect(await flags(ACC.other)).toEqual({ case_study_candidate: false, case_study_approved: false });
  });
});

describe("disconnectDocumentFromTask", () => {
  const linked = (taskId: string, documentId: string) =>
    prismadb.documentsToTasks.count({ where: { task_id: taskId, document_id: documentId } });

  it("user is refused on another user's task, same as a missing task id; link stays", async () => {
    as("rep");
    expect(await disconnectDocumentFromTask({ taskId: randomUUID(), documentId: DOC.other })).toEqual({ error: "Forbidden" });
    expect(await disconnectDocumentFromTask({ taskId: TASK.other, documentId: DOC.other })).toEqual({ error: "Forbidden" });
    expect(await linked(TASK.other, DOC.other)).toBe(1);
  });

  it("user is refused for a document he cannot read, even on his own task; link stays", async () => {
    as("rep");
    expect(await disconnectDocumentFromTask({ taskId: TASK.rep, documentId: DOC.other })).toEqual({ error: "Forbidden" });
    expect(await linked(TASK.rep, DOC.other)).toBe(1);
  });

  it("own task and document as user, another user's as manager", async () => {
    as("rep");
    expect(await disconnectDocumentFromTask({ taskId: TASK.rep, documentId: DOC.rep })).toHaveProperty("data");
    expect(await linked(TASK.rep, DOC.rep)).toBe(0);
    as("boss");
    expect(await disconnectDocumentFromTask({ taskId: TASK.other, documentId: DOC.other })).toHaveProperty("data");
    expect(await linked(TASK.other, DOC.other)).toBe(0);
  });
});
