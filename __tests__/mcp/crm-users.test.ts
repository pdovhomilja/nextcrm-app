// crm_list_users exists so an agent can resolve a person to the user ID that
// assigned_to needs. Field exposure mirrors the web UI: actions/user/search-users.ts
// hands every authenticated user id/name/avatar for ACTIVE users, while email,
// role and status stay admin-module territory.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn(), update: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_Contacts: { findFirst: jest.fn() },
  },
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prismadb } from "@/lib/prisma";
import { crmUserTools } from "@/lib/mcp/tools/crm-users";
import { crmOpportunityTools } from "@/lib/mcp/tools/crm-opportunities";

type Role = "user" | "manager" | "admin";
const MEMBER = { id: "u1", role: "user" as Role };
const MANAGER = { id: "m1", role: "manager" as Role };
const ADMIN = { id: "a1", role: "admin" as Role };

const tools = [...crmUserTools, ...crmOpportunityTools];
const run = (name: string, args: any, user: { id: string; role: Role }) => {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return (t.handler as any)(args, user.id, user);
};

const users = prismadb.users as any;
const opps = prismadb.crm_Opportunities as any;

beforeEach(() => {
  jest.clearAllMocks();
  users.findMany.mockResolvedValue([]);
  users.count.mockResolvedValue(0);
  users.findFirst.mockResolvedValue({ id: "u2" });
  opps.findFirst.mockResolvedValue({ id: "o1" });
  opps.update.mockResolvedValue({ id: "o1" });
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

describe("crm_update_opportunity reassignment", () => {
  it("persists assigned_to", async () => {
    await run("crm_update_opportunity", { id: "o1", assigned_to: "u2" }, ADMIN);
    expect(opps.update.mock.calls[0][0].data.assigned_to).toBe("u2");
  });

  it("rejects an unknown assignee instead of writing a dangling FK", async () => {
    users.findFirst.mockResolvedValue(null);
    await expect(
      run("crm_update_opportunity", { id: "o1", assigned_to: "ghost" }, ADMIN)
    ).rejects.toThrow("NOT_FOUND");
    expect(opps.update).not.toHaveBeenCalled();
  });

  it("refuses to park work on a non-active account", async () => {
    users.findFirst.mockResolvedValue(null);
    await expect(
      run("crm_update_opportunity", { id: "o1", assigned_to: "u2" }, ADMIN)
    ).rejects.toThrow("NOT_FOUND");
    expect(users.findFirst.mock.calls[0][0].where.userStatus).toBe("ACTIVE");
  });

  it("explicit null unassigns without validating a user", async () => {
    await run("crm_update_opportunity", { id: "o1", assigned_to: null }, ADMIN);
    expect(opps.update.mock.calls[0][0].data.assigned_to).toBeNull();
    expect(users.findFirst).not.toHaveBeenCalled();
  });

  it("omitting assigned_to leaves the owner untouched", async () => {
    await run("crm_update_opportunity", { id: "o1", name: "renamed" }, ADMIN);
    expect(opps.update.mock.calls[0][0].data).not.toHaveProperty("assigned_to");
  });

  it("checks the opportunity is writable before validating the assignee", async () => {
    opps.findFirst.mockResolvedValue(null);
    await expect(
      run("crm_update_opportunity", { id: "victim", assigned_to: "u2" }, MEMBER)
    ).rejects.toThrow("NOT_FOUND");
    expect(users.findFirst).not.toHaveBeenCalled();
    expect(opps.update).not.toHaveBeenCalled();
  });
});
