/**
 * MCP project tools, called the way the MCP route calls them (runMcpToolCall
 * around the real handler) against Postgres. DB-backed: CI runs it in the
 * integration job.
 *
 * - Sections and tasks have BigInt columns (position, likes). The tool result
 *   must still come back as JSON, with BigInt values as strings (Sentinel
 *   retest 2026-10-30: "Do not know how to serialize a BigInt").
 * - projects_delete_task deletes the task like the UI deleteTask action, with
 *   the UI's check (write access to the parent board, not task assignee).
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { projectTools } from "@/lib/mcp/tools/projects";
import { runMcpToolCall } from "@/lib/mcp/run-tool";

const tag = randomUUID().slice(0, 8);
const OWNER = randomUUID();
const ASSIGNEE = randomUUID();
const BOARD = randomUUID();
const owner: AuthzUser = { id: OWNER, role: "user" };
const assignee: AuthzUser = { id: ASSIGNEE, role: "user" };

async function mcp(name: string, args: unknown, user: AuthzUser = owner) {
  const tool = projectTools.find((t) => t.name === name)!;
  const res = await runMcpToolCall(async () => user as never, (u) => (tool.handler as any)(args, u.id, u));
  return { isError: res.isError, body: JSON.parse(res.content[0].text) };
}

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [OWNER, ASSIGNEE].map((id, i) => ({
      id, email: `u${i}-${tag}@mcp-projects.test`, name: `u${i}-${tag}`, role: "user" as const, userStatus: "ACTIVE" as const,
    })),
  });
  await prismadb.boards.create({
    data: { id: BOARD, v: 0, title: `board-${tag}`, description: "", user: OWNER },
  });
});

afterAll(async () => {
  const sections = await prismadb.sections.findMany({ where: { board: BOARD }, select: { id: true } });
  await prismadb.tasks.deleteMany({ where: { section: { in: sections.map((s) => s.id) } } });
  await prismadb.sections.deleteMany({ where: { board: BOARD } });
  await prismadb.boards.deleteMany({ where: { id: BOARD } });
  await prismadb.users.deleteMany({ where: { id: { in: [OWNER, ASSIGNEE] } } });
  await prismadb.$disconnect();
});

describe("BigInt columns in MCP project tool results", () => {
  let sectionId: string;
  let taskId: string;

  it("projects_create_section returns the section with position as a string", async () => {
    const { isError, body } = await mcp("projects_create_section", { board: BOARD, title: `s-${tag}` });
    expect(isError).toBeUndefined();
    expect(body.data).toMatchObject({ board: BOARD, title: `s-${tag}`, position: "1000" });
    sectionId = body.data.id;
  });

  it("projects_create_task returns the task with position and likes as strings", async () => {
    const { isError, body } = await mcp("projects_create_task", { title: `t-${tag}`, section: sectionId, priority: "Normal" });
    expect(isError).toBeUndefined();
    expect(body.data).toMatchObject({ title: `t-${tag}`, section: sectionId, position: "1000", likes: "0" });
    taskId = body.data.id;
  });

  it("projects_get_board returns sections and tasks with BigInt values as strings", async () => {
    const { isError, body } = await mcp("projects_get_board", { id: BOARD });
    expect(isError).toBeUndefined();
    expect(body.data.sections).toEqual([
      expect.objectContaining({ id: sectionId, position: "1000", tasks: [expect.objectContaining({ id: taskId, position: "1000" })] }),
    ]);
  });

  it("projects_list_tasks returns the tasks with BigInt values as strings", async () => {
    const { isError, body } = await mcp("projects_list_tasks", { board: BOARD, limit: 10, offset: 0 });
    expect(isError).toBeUndefined();
    expect(body.total).toBe(1);
    expect(body.data).toEqual([expect.objectContaining({ id: taskId, position: "1000", likes: "0" })]);
  });
});

describe("projects_delete_task", () => {
  let taskId: string;

  beforeAll(async () => {
    const section = await prismadb.sections.create({ data: { v: 0, board: BOARD, title: `del-${tag}`, position: BigInt(5000) } });
    const task = await prismadb.tasks.create({
      data: { v: 0, title: `del-${tag}`, section: section.id, priority: "Normal", position: BigInt(1000), user: ASSIGNEE },
    });
    taskId = task.id;
    await prismadb.tasksComments.create({ data: { v: 0, task: taskId, comment: "c", user: OWNER } });
  });

  it("refuses the task's assignee who cannot write the board, and leaves the task", async () => {
    const { isError, body } = await mcp("projects_delete_task", { id: taskId }, assignee);
    expect(isError).toBe(true);
    expect(body.code).toBe("NOT_FOUND");
    const after = await mcp("projects_get_task", { id: taskId });
    expect(after.body.data).toMatchObject({ id: taskId, taskStatus: "ACTIVE" });
  });

  it("deletes the task (and its comments) for the board owner", async () => {
    const { isError, body } = await mcp("projects_delete_task", { id: taskId });
    expect(isError).toBeUndefined();
    expect(body.data).toEqual({ id: taskId, deleted: true });
    const after = await mcp("projects_get_task", { id: taskId });
    expect(after.body.code).toBe("NOT_FOUND");
  });
});
