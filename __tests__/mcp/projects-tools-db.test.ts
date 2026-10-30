/**
 * MCP project tools, called the way the MCP route calls them (runMcpToolCall
 * around the real handler) against Postgres. DB-backed: CI runs it in the
 * integration job.
 *
 * - Sections and tasks have BigInt columns (position, likes). The tool result
 *   must still come back as JSON, with BigInt values as strings (Sentinel
 *   retest 2026-10-30: "Do not know how to serialize a BigInt").
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { projectTools } from "@/lib/mcp/tools/projects";
import { runMcpToolCall } from "@/lib/mcp/run-tool";

const tag = randomUUID().slice(0, 8);
const OWNER = randomUUID();
const BOARD = randomUUID();
const owner: AuthzUser = { id: OWNER, role: "user" };

async function mcp(name: string, args: unknown, user: AuthzUser = owner) {
  const tool = projectTools.find((t) => t.name === name)!;
  const res = await runMcpToolCall(async () => user as never, (u) => (tool.handler as any)(args, u.id, u));
  return { isError: res.isError, body: JSON.parse(res.content[0].text) };
}

beforeAll(async () => {
  await prismadb.users.create({
    data: { id: OWNER, email: `owner-${tag}@mcp-projects.test`, name: `owner-${tag}`, role: "user", userStatus: "ACTIVE" },
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
  await prismadb.users.deleteMany({ where: { id: OWNER } });
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
