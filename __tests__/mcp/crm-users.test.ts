// crm_list_users exists so an agent can resolve a person to the user ID that
// assigned_to needs. Field exposure mirrors the web UI: actions/user/search-users.ts
// hands every authenticated user id/name/avatar for ACTIVE users, while email,
// role and status stay admin-module territory.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn(), update: jest.fn() },
    crm_Accounts: { findFirst: jest.fn(), update: jest.fn() },
    crm_Contacts: { findFirst: jest.fn(), update: jest.fn() },
    crm_Leads: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prismadb } from "@/lib/prisma";
import { crmUserTools } from "@/lib/mcp/tools/crm-users";
import { crmOpportunityTools } from "@/lib/mcp/tools/crm-opportunities";
import { crmAccountTools } from "@/lib/mcp/tools/crm-accounts";
import { crmContactTools } from "@/lib/mcp/tools/crm-contacts";
import { crmLeadTools } from "@/lib/mcp/tools/crm-leads";

type Role = "user" | "manager" | "admin";
const MEMBER = { id: "u1", role: "user" as Role };
const MANAGER = { id: "m1", role: "manager" as Role };
const ADMIN = { id: "a1", role: "admin" as Role };

const tools = [
  ...crmUserTools,
  ...crmOpportunityTools,
  ...crmAccountTools,
  ...crmContactTools,
  ...crmLeadTools,
];
const run = (name: string, args: any, user: { id: string; role: Role }) => {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return (t.handler as any)(args, user.id, user);
};

const users = prismadb.users as any;

// Every entity that carries assigned_to and can be reassigned over MCP.
const REASSIGNABLE = [
  { tool: "crm_update_opportunity", model: prismadb.crm_Opportunities },
  { tool: "crm_update_account", model: prismadb.crm_Accounts },
  { tool: "crm_update_contact", model: prismadb.crm_Contacts },
  { tool: "crm_update_lead", model: prismadb.crm_Leads },
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  users.findMany.mockResolvedValue([]);
  users.count.mockResolvedValue(0);
  users.findFirst.mockResolvedValue({ id: "u2" });
  for (const { model } of REASSIGNABLE) {
    (model as any).findFirst.mockResolvedValue({ id: "x1" });
    (model as any).update.mockResolvedValue({ id: "x1" });
  }
});

// The registry can't be imported here: lib/mcp/tools/index.ts pulls in
// projects.ts, which imports the @/lib/authz barrel and therefore ESM-only
// better-auth (see the note atop lib/mcp/helpers.ts). Assert on the source so
// a tool that is written but never wired up still fails the suite.
describe("crm_list_users registration", () => {
  const registry = readFileSync(
    join(process.cwd(), "lib/mcp/tools/index.ts"),
    "utf8"
  );

  it("is spread into allTools", () => {
    expect(registry).toMatch(/\.\.\.crmUserTools,/);
  });

  it("is imported by the registry", () => {
    expect(registry).toMatch(/import \{ crmUserTools \} from "\.\/crm-users";/);
  });

  it("exposes exactly one tool, named crm_list_users", () => {
    expect(crmUserTools.map((t) => t.name)).toEqual(["crm_list_users"]);
  });
});

describe("crm_list_users field exposure", () => {
  it("members get only id/name/avatar, matching the web UI picker", async () => {
    await run("crm_list_users", { limit: 20, offset: 0 }, MEMBER);
    const select = users.findMany.mock.calls[0][0].select;
    expect(select).toEqual({ id: true, name: true, avatar: true });
    expect(select.email).toBeUndefined();
    expect(select.role).toBeUndefined();
  });

  it.each([
    ["manager", MANAGER],
    ["admin", ADMIN],
  ])("%s additionally gets email, role and status", async (_label, user) => {
    await run("crm_list_users", { limit: 20, offset: 0 }, user);
    const select = users.findMany.mock.calls[0][0].select;
    expect(select.email).toBe(true);
    expect(select.role).toBe(true);
    expect(select.userStatus).toBe(true);
    expect(select.id).toBe(true);
  });

  it("never selects the password column for anyone", async () => {
    for (const user of [MEMBER, MANAGER, ADMIN]) {
      await run("crm_list_users", { limit: 20, offset: 0 }, user);
    }
    for (const call of users.findMany.mock.calls) {
      expect(call[0].select).not.toHaveProperty("password");
    }
  });
});

describe("crm_list_users status filtering", () => {
  it("defaults to active users only", async () => {
    await run("crm_list_users", { limit: 20, offset: 0 }, MEMBER);
    expect(users.findMany.mock.calls[0][0].where.userStatus).toBe("ACTIVE");
  });

  it("a member cannot widen the status filter", async () => {
    await run("crm_list_users", { status: "ALL", limit: 20, offset: 0 }, MEMBER);
    expect(users.findMany.mock.calls[0][0].where.userStatus).toBe("ACTIVE");
  });

  it("a member cannot enumerate pending accounts", async () => {
    await run("crm_list_users", { status: "PENDING", limit: 20, offset: 0 }, MEMBER);
    expect(users.findMany.mock.calls[0][0].where.userStatus).toBe("ACTIVE");
  });

  it("an admin may request all statuses", async () => {
    await run("crm_list_users", { status: "ALL", limit: 20, offset: 0 }, ADMIN);
    expect(users.findMany.mock.calls[0][0].where).not.toHaveProperty("userStatus");
  });

  it("an admin may filter to inactive users", async () => {
    await run("crm_list_users", { status: "INACTIVE", limit: 20, offset: 0 }, ADMIN);
    expect(users.findMany.mock.calls[0][0].where.userStatus).toBe("INACTIVE");
  });
});

describe("crm_list_users search", () => {
  it("matches names case-insensitively", async () => {
    await run("crm_list_users", { query: "pav", limit: 20, offset: 0 }, MEMBER);
    expect(users.findMany.mock.calls[0][0].where.name).toEqual({
      contains: "pav",
      mode: "insensitive",
    });
  });

  it("count uses the same where clause as findMany", async () => {
    await run("crm_list_users", { query: "pav", limit: 20, offset: 0 }, MEMBER);
    expect(users.count.mock.calls[0][0].where).toEqual(
      users.findMany.mock.calls[0][0].where
    );
  });
});

describe.each(REASSIGNABLE)("$tool reassignment", ({ tool, model }) => {
  const m = model as any;
  const UUID = "11111111-1111-4111-8111-111111111111";
  const ASSIGNEE = "22222222-2222-4222-8222-222222222222";

  // The handler tests below call handlers directly, which bypasses validation.
  // The route validates through tool.schema, and a zod object strips keys it
  // does not declare — so without this, a missing schema field would look fine.
  it("declares assigned_to on the schema so the route does not strip it", () => {
    const schema = tools.find((t) => t.name === tool)!.schema as any;
    expect(schema.parse({ id: UUID, assigned_to: ASSIGNEE }).assigned_to).toBe(ASSIGNEE);
  });

  it("accepts an explicit null through the schema", () => {
    const schema = tools.find((t) => t.name === tool)!.schema as any;
    expect(schema.parse({ id: UUID, assigned_to: null }).assigned_to).toBeNull();
  });

  it("rejects a non-uuid assignee at the schema", () => {
    const schema = tools.find((t) => t.name === tool)!.schema as any;
    expect(() => schema.parse({ id: UUID, assigned_to: "not-a-uuid" })).toThrow();
  });

  it("persists assigned_to", async () => {
    await run(tool, { id: "x1", assigned_to: "u2" }, ADMIN);
    expect(m.update.mock.calls[0][0].data.assigned_to).toBe("u2");
  });

  it("rejects an unknown assignee instead of writing a dangling FK", async () => {
    users.findFirst.mockResolvedValue(null);
    await expect(run(tool, { id: "x1", assigned_to: "ghost" }, ADMIN)).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(m.update).not.toHaveBeenCalled();
  });

  it("refuses to park work on a non-active account", async () => {
    users.findFirst.mockResolvedValue(null);
    await expect(run(tool, { id: "x1", assigned_to: "u2" }, ADMIN)).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(users.findFirst.mock.calls[0][0].where.userStatus).toBe("ACTIVE");
  });

  it("explicit null unassigns without validating a user", async () => {
    await run(tool, { id: "x1", assigned_to: null }, ADMIN);
    expect(m.update.mock.calls[0][0].data.assigned_to).toBeNull();
    expect(users.findFirst).not.toHaveBeenCalled();
  });

  it("omitting assigned_to leaves the owner untouched", async () => {
    await run(tool, { id: "x1" }, ADMIN);
    expect(m.update.mock.calls[0][0].data).not.toHaveProperty("assigned_to");
  });

  it("checks the record is writable before validating the assignee", async () => {
    m.findFirst.mockResolvedValue(null);
    await expect(run(tool, { id: "victim", assigned_to: "u2" }, MEMBER)).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(users.findFirst).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });
});
