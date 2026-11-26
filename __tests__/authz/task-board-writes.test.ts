/**
 * Task writes check every id they take from the client: the section a task is
 * created in or moved to must sit on a board the caller can write, a task can
 * only be moved to a section on its own board or another board the caller
 * writes, the assignee must be an active user, the audit fields come from the
 * session, and a document linked to a CRM task must be readable by the caller.
 * DB-backed: CI runs it in the integration job.
 *
 * Fixture: plain users `rep` and `other`, an inactive user `gone`. rep owns
 * boards R and R2, other owns the public board O. On O, rep is the assignee of
 * one task (a role-user assignee may update its status, nothing more).
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const send = jest.fn();
jest.mock("@/lib/resend", () => ({ __esModule: true, default: async () => ({ emails: { send } }) }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createTaskInBoard } from "@/actions/projects/create-task-in-board";
import { updateKanbanPosition } from "@/actions/projects/update-kanban-position";
import { createTask as createProjectTask } from "@/actions/projects/create-task";
import { updateTask } from "@/actions/projects/update-task";
import { createTask as createAccountTask } from "@/actions/crm/accounts/create-task";
import { assignDocumentToCrmTask, disconnectDocumentFromCrmTask } from "@/actions/crm/tasks/assign-document";
import { projectTools } from "@/lib/mcp/tools/projects";
import { runMcpToolCall } from "@/lib/mcp/run-tool";

const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), other: randomUUID(), gone: randomUUID() };
const B = { R: randomUUID(), R2: randomUUID(), O: randomUUID() };
const S = { R: randomUUID(), R2: randomUUID(), O: randomUUID() };
const T = { rep: randomUUID(), assigned: randomUUID(), other: randomUUID() };
const ACC = randomUUID();
const CT = randomUUID();
const DOC = { rep: randomUUID(), other: randomUUID() };

const as = (who: keyof typeof U) => (getSession as jest.Mock).mockResolvedValue({ user: { id: U[who] } });
const sectionOf = async (id: string) => (await prismadb.tasks.findUnique({ where: { id } }))?.section;
const countIn = (section: string) => prismadb.tasks.count({ where: { section } });

beforeAll(async () => {
  await prismadb.users.createMany({
    data: (["rep", "other", "gone"] as const).map((k) => ({
      id: U[k], email: `${k}-${tag}@task-board.test`, name: `${k}-${tag}`,
      role: "user", userStatus: k === "gone" ? "INACTIVE" : "ACTIVE",
    })),
  });
  const owner = { R: U.rep, R2: U.rep, O: U.other };
  for (const k of ["R", "R2", "O"] as const) {
    await prismadb.boards.create({
      data: { id: B[k], v: 0, title: `${k}-${tag}`, description: "x", user: owner[k], visibility: k === "O" ? "public" : "private" },
    });
    await prismadb.sections.create({ data: { id: S[k], v: 0, board: B[k], title: `${k}-${tag}`, position: 0 } });
  }
  const task = (id: string, section: string, user: string) =>
    prismadb.tasks.create({ data: { id, v: 0, position: 0, priority: "low", title: `t-${tag}`, user, section } });
  await task(T.rep, S.R, U.rep);
  await task(T.assigned, S.O, U.rep);
  await task(T.other, S.O, U.other);
  await prismadb.crm_Accounts.create({ data: { id: ACC, v: 0, name: `acc-${tag}`, assigned_to: U.rep, createdBy: U.rep } });
  await prismadb.crm_Accounts_Tasks.create({
    data: { id: CT, v: 0, priority: "low", title: `ct-${tag}`, account: ACC, user: U.rep, createdBy: U.rep },
  });
  for (const k of ["rep", "other"] as const) {
    await prismadb.documents.create({
      data: {
        id: DOC[k], document_name: `${k}-${tag}`, document_file_url: "x", document_file_mimeType: "application/pdf",
        created_by_user: U[k], assigned_user: U[k],
      },
    });
  }
});

afterAll(async () => {
  await prismadb.documentsToCrmAccountsTasks.deleteMany({ where: { crm_accounts_task_id: CT } });
  await prismadb.crm_Accounts_Tasks.deleteMany({ where: { account: ACC } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: ACC } });
  await prismadb.tasks.deleteMany({ where: { section: { in: Object.values(S) } } });
  await prismadb.sections.deleteMany({ where: { id: { in: Object.values(S) } } });
  await prismadb.boards.deleteMany({ where: { id: { in: Object.values(B) } } });
  await prismadb.documents.deleteMany({ where: { id: { in: Object.values(DOC) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

const full = (extra: object) => ({ title: `t-${tag}`, priority: "low", content: "c", ...extra });

describe("createTaskInBoard section", () => {
  it.each([
    ["quick add", {}],
    ["full detail", full({ user: U.rep })],
  ])("%s: refuses a section of another board and creates nothing", async (_l, extra) => {
    as("rep");
    const before = await countIn(S.O);
    expect(await createTaskInBoard({ boardId: B.R, section: S.O, ...extra })).toEqual({ error: "Forbidden" });
    expect(await countIn(S.O)).toBe(before);
  });

  it("refuses a section id that is not a string", async () => {
    as("rep");
    const before = await countIn(S.R);
    expect(await createTaskInBoard({ boardId: B.R, section: { in: [S.R] } as never })).toEqual({ error: "Forbidden" });
    expect(await countIn(S.R)).toBe(before);
  });

  it("creates a task in a section of the board", async () => {
    as("rep");
    const before = await countIn(S.R);
    expect(await createTaskInBoard({ boardId: B.R, section: S.R })).toEqual({ success: true });
    expect(await countIn(S.R)).toBe(before + 1);
  });
});

describe("updateKanbanPosition sections", () => {
  it("refuses moving the caller's task into a section of a board he cannot write", async () => {
    as("rep");
    const r = await updateKanbanPosition({ resourceList: [], destinationList: [{ id: T.rep }], resourceSectionId: S.R, destinationSectionId: S.O });
    expect(r).toEqual({ error: "Forbidden" });
    expect(await sectionOf(T.rep)).toBe(S.R);
  });

  it("refuses an assignee moving a task off its board into his own board", async () => {
    as("rep");
    const r = await updateKanbanPosition({ resourceList: [], destinationList: [{ id: T.assigned }], resourceSectionId: S.R, destinationSectionId: S.R });
    expect(r).toEqual({ error: "Forbidden" });
    expect(await sectionOf(T.assigned)).toBe(S.O);
  });

  it("refuses an assignee reordering a board he cannot write", async () => {
    as("rep");
    const r = await updateKanbanPosition({ resourceList: [], destinationList: [{ id: T.assigned }, { id: T.other }], resourceSectionId: S.O, destinationSectionId: S.O });
    expect(r).toEqual({ error: "Forbidden" });
  });

  it("lets an assignee move his task within its own board", async () => {
    as("rep");
    const r = await updateKanbanPosition({ resourceList: [], destinationList: [{ id: T.assigned }], resourceSectionId: S.O, destinationSectionId: S.O });
    expect(r).toEqual({ success: true });
    expect(await sectionOf(T.assigned)).toBe(S.O);
  });

  it("moves the caller's task between sections of boards he writes", async () => {
    as("rep");
    const r = await updateKanbanPosition({ resourceList: [], destinationList: [{ id: T.rep }], resourceSectionId: S.R, destinationSectionId: S.R2 });
    expect(r).toEqual({ success: true });
    expect(await sectionOf(T.rep)).toBe(S.R2);
  });
});

describe("task assignee and audit fields", () => {
  it("projects createTask refuses an inactive assignee", async () => {
    as("rep");
    const before = await countIn(S.R);
    expect(await createProjectTask(full({ user: U.gone, board: B.R }) as never)).toEqual({ error: "Forbidden" });
    expect(await countIn(S.R)).toBe(before);
  });

  it("createTaskInBoard refuses an inactive assignee", async () => {
    as("rep");
    const before = await countIn(S.R);
    expect(await createTaskInBoard({ boardId: B.R, section: S.R, ...full({ user: U.gone }) })).toEqual({ error: "Forbidden" });
    expect(await countIn(S.R)).toBe(before);
  });

  it("createTaskInBoard records the caller as creator when assigning someone else", async () => {
    as("rep");
    const title = `t-${tag}-for-other`;
    expect(await createTaskInBoard({ boardId: B.R, section: S.R, ...full({ user: U.other, title }) })).toEqual({ success: true });
    expect(await prismadb.tasks.findFirst({ where: { title } })).toMatchObject({ user: U.other, createdBy: U.rep, updatedBy: U.rep });
  });

  it("updateTask refuses an inactive assignee and changes nothing", async () => {
    as("rep");
    const r = await updateTask({ taskId: T.rep, ...full({ user: U.gone, title: "changed" }) } as never);
    expect(r).toEqual({ error: "Forbidden" });
    expect(await prismadb.tasks.findUnique({ where: { id: T.rep } })).toMatchObject({ user: U.rep, title: `t-${tag}` });
  });

  it("updateTask records the caller as editor when assigning someone else", async () => {
    as("rep");
    expect(await updateTask({ taskId: T.rep, ...full({ user: U.other }) } as never)).toEqual({ success: true });
    expect(await prismadb.tasks.findUnique({ where: { id: T.rep } })).toMatchObject({ user: U.other, updatedBy: U.rep });
  });

  it("account createTask refuses an inactive assignee", async () => {
    as("rep");
    const before = await prismadb.crm_Accounts_Tasks.count({ where: { account: ACC } });
    expect(await createAccountTask(full({ user: U.gone, account: ACC }) as never)).toEqual({ error: "Forbidden" });
    expect(await prismadb.crm_Accounts_Tasks.count({ where: { account: ACC } })).toBe(before);
  });
});

describe("CRM task documents", () => {
  const links = (documentId: string) =>
    prismadb.documentsToCrmAccountsTasks.count({ where: { crm_accounts_task_id: CT, document_id: documentId } });

  it("refuses linking a document the caller cannot read", async () => {
    as("rep");
    expect(await assignDocumentToCrmTask({ documentId: DOC.other, taskId: CT })).toEqual({ error: "Forbidden" });
    expect(await links(DOC.other)).toBe(0);
  });

  it("links a readable document", async () => {
    as("rep");
    expect(await assignDocumentToCrmTask({ documentId: DOC.rep, taskId: CT })).toEqual({ success: true });
    expect(await links(DOC.rep)).toBe(1);
  });

  it("refuses unlinking a document the caller cannot read", async () => {
    await prismadb.documentsToCrmAccountsTasks.create({ data: { crm_accounts_task_id: CT, document_id: DOC.other } });
    as("rep");
    expect(await disconnectDocumentFromCrmTask({ documentId: DOC.other, taskId: CT })).toEqual({ error: "Forbidden" });
    expect(await links(DOC.other)).toBe(1);
  });
});

describe("MCP projects_move_task", () => {
  const move = async (id: string, section: string) => {
    const tool = projectTools.find((t) => t.name === "projects_move_task")!;
    const user = { id: U.rep, role: "user" } as const;
    return runMcpToolCall(async () => user as never, (u) => (tool.handler as any)({ id, section }, u.id, u));
  };

  it("refuses an assignee moving a task off its board into his own board", async () => {
    const res = await move(T.assigned, S.R);
    expect(res.isError).toBe(true);
    expect(await sectionOf(T.assigned)).toBe(S.O);
  });

  it("moves the caller's task to a section of another board he writes", async () => {
    const res = await move(T.rep, S.R);
    expect(res.isError).toBeFalsy();
    expect(await sectionOf(T.rep)).toBe(S.R);
  });
});
