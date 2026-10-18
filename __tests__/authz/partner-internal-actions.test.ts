/**
 * Server actions of modules a partner has no route to (campaigns, targets,
 * target lists, projects) are still callable by action id from any page, so
 * proxy.ts cannot stop them. These were authorized by session alone; they
 * must refuse a partner before writing anything (partner-role spec, ticket 4).
 */
const mockWrites: string[] = [];
jest.mock("@/lib/prisma", () => {
  const WRITES = ["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"];
  const model = (modelName: string) =>
    new Proxy({} as Record<string, jest.Mock>, {
      get: (target, name: string) =>
        (target[name] ??= jest.fn(async () => {
          if (WRITES.includes(name)) mockWrites.push(`${modelName}.${name}`);
          if (modelName === "users" && name === "findUnique") return { id: "p1", role: "partner" };
          if (name === "count") return 0;
          if (name === "findMany" || name === "createManyAndReturn") return [];
          return { id: "row-1" };
        })),
    });
  const models: Record<string, unknown> = {};
  return { prismadb: new Proxy(models, { get: (t, n: string) => (t[n] ??= model(n)) }) };
});
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn(async () => ({ user: { id: "p1", role: "partner", userStatus: "ACTIVE" } })),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/spreadsheet/parse", () => ({
  parseSpreadsheetFile: jest.fn(async () => [{ last_name: "Novák", email: "n@example.com" }]),
}));

import { createTemplate } from "@/actions/campaigns/templates/create-template";
import { createTargetList } from "@/actions/crm/target-lists/create-target-list";
import { createTarget } from "@/actions/crm/targets/create-target";
import { importTargets } from "@/actions/crm/targets/import-targets";
import { createProject } from "@/actions/projects/create-project";

const importForm = () => {
  const fd = new FormData();
  fd.append("file", new File(["last_name\nNovák"], "t.csv", { type: "text/csv" }));
  return fd;
};

const calls: [string, () => Promise<unknown>][] = [
  ["createTemplate", () => createTemplate({ name: "T", content_html: "<p/>", content_json: {} })],
  ["createTargetList", () => createTargetList({ name: "L" })],
  ["createTarget", () => createTarget({ last_name: "Novák", email: "n@example.com" })],
  ["importTargets", () => importTargets(importForm())],
  ["createProject", () => createProject({ title: "P", description: "D", visibility: "private" })],
];

beforeEach(() => (mockWrites.length = 0));

it.each(calls)("%s refuses a partner and writes nothing", async (_name, call) => {
  const result = await call().catch((e: Error) => ({ thrown: e.name }));
  expect(mockWrites).toEqual([]);
  expect(JSON.stringify(result)).toMatch(/Forbidden|AuthorizationError/);
});
