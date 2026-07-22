// The MCP CRM read handlers used to hardcode `assigned_to: userId`, which is
// stricter than the web UI: an admin/manager token only ever saw its own rows.
// They now share the role-aware scope helpers in lib/authz/scopes/crm.ts.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    crm_Accounts: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    crm_Contacts: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    crm_Leads: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { crmOpportunityTools } from "@/lib/mcp/tools/crm-opportunities";
import { crmAccountTools } from "@/lib/mcp/tools/crm-accounts";
import { crmContactTools } from "@/lib/mcp/tools/crm-contacts";
import { crmLeadTools } from "@/lib/mcp/tools/crm-leads";

type Role = "user" | "manager" | "admin";
const MEMBER = { id: "u1", role: "user" as Role };
const MANAGER = { id: "m1", role: "manager" as Role };
const ADMIN = { id: "a1", role: "admin" as Role };

const allTools = [
  ...crmOpportunityTools,
  ...crmAccountTools,
  ...crmContactTools,
  ...crmLeadTools,
];
// Handlers receive (args, userId, user)
const run = (name: string, args: any, user: { id: string; role: Role }) => {
  const t = allTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return (t.handler as any)(args, user.id, user);
};

// Flatten a scope `OR` into the list of ownership columns it constrains.
const ownershipKeys = (where: any) =>
  (where.OR ?? []).flatMap((clause: any) => Object.keys(clause));

const listMocks = {
  crm_list_opportunities: prismadb.crm_Opportunities,
  crm_list_accounts: prismadb.crm_Accounts,
  crm_list_contacts: prismadb.crm_Contacts,
  crm_list_leads: prismadb.crm_Leads,
} as const;

const searchMocks = {
  crm_search_opportunities: prismadb.crm_Opportunities,
  crm_search_accounts: prismadb.crm_Accounts,
  crm_search_contacts: prismadb.crm_Contacts,
  crm_search_leads: prismadb.crm_Leads,
} as const;

const getMocks = {
  crm_get_opportunity: prismadb.crm_Opportunities,
  crm_get_account: prismadb.crm_Accounts,
  crm_get_contact: prismadb.crm_Contacts,
  crm_get_lead: prismadb.crm_Leads,
} as const;

beforeEach(() => jest.clearAllMocks());

describe.each(Object.entries(listMocks))("%s read scope", (toolName, model) => {
  const m = model as any;

  it.each([
    ["admin", ADMIN],
    ["manager", MANAGER],
  ])("%s sees every non-deleted row (no ownership filter)", async (_label, user) => {
    m.findMany.mockResolvedValue([]);
    m.count.mockResolvedValue(0);
    await run(toolName, { limit: 20, offset: 0 }, user);
    const where = m.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ deletedAt: null });
    expect(where.assigned_to).toBeUndefined();
  });

  it("member stays restricted to rows they own or are linked to", async () => {
    m.findMany.mockResolvedValue([]);
    m.count.mockResolvedValue(0);
    await run(toolName, { limit: 20, offset: 0 }, MEMBER);
    const where = m.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(ownershipKeys(where)).toContain("assigned_to");
    // The scope must never widen to every row for a plain member.
    expect(where.OR.length).toBeGreaterThan(0);
  });

  it("member and admin do not receive the same where clause", async () => {
    m.findMany.mockResolvedValue([]);
    m.count.mockResolvedValue(0);
    await run(toolName, { limit: 20, offset: 0 }, MEMBER);
    await run(toolName, { limit: 20, offset: 0 }, ADMIN);
    const memberWhere = m.findMany.mock.calls[0][0].where;
    const adminWhere = m.findMany.mock.calls[1][0].where;
    expect(memberWhere).not.toEqual(adminWhere);
  });

  it("count uses the same where clause as findMany", async () => {
    m.findMany.mockResolvedValue([]);
    m.count.mockResolvedValue(0);
    await run(toolName, { limit: 20, offset: 0 }, MEMBER);
    expect(m.count.mock.calls[0][0].where).toEqual(m.findMany.mock.calls[0][0].where);
  });
});

describe.each(Object.entries(getMocks))("%s read scope", (toolName, model) => {
  const m = model as any;

  it("admin lookup is not filtered by assigned_to", async () => {
    m.findFirst.mockResolvedValue({ id: "x1" });
    await run(toolName, { id: "x1" }, ADMIN);
    const where = m.findFirst.mock.calls[0][0].where;
    expect(where).toEqual({ id: "x1", deletedAt: null });
  });

  it("member lookup keeps the ownership OR", async () => {
    m.findFirst.mockResolvedValue({ id: "x1" });
    await run(toolName, { id: "x1" }, MEMBER);
    const where = m.findFirst.mock.calls[0][0].where;
    expect(where.id).toBe("x1");
    expect(ownershipKeys(where)).toContain("assigned_to");
  });

  it("out-of-scope row still surfaces NOT_FOUND", async () => {
    m.findFirst.mockResolvedValue(null);
    await expect(run(toolName, { id: "victim" }, MEMBER)).rejects.toThrow("NOT_FOUND");
  });
});

describe.each(Object.entries(searchMocks))("%s read scope", (toolName, model) => {
  const m = model as any;

  it("admin search is not filtered by assigned_to", async () => {
    m.findMany.mockResolvedValue([]);
    m.count.mockResolvedValue(0);
    await run(toolName, { query: "acme", limit: 20, offset: 0 }, ADMIN);
    const where = m.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.assigned_to).toBeUndefined();
    // With no scope OR to preserve, the search terms are the only AND branch.
    expect(where.AND[0].OR.length).toBeGreaterThan(0);
  });

  // Regression: the scope helper returns its own `OR`. Spreading the search
  // terms as a sibling `OR` would overwrite it and expose every row matching
  // the query to a plain member.
  it("member search intersects the scope instead of replacing it", async () => {
    m.findMany.mockResolvedValue([]);
    m.count.mockResolvedValue(0);
    await run(toolName, { query: "acme", limit: 20, offset: 0 }, MEMBER);
    const where = m.findMany.mock.calls[0][0].where;

    // Scope survives...
    expect(ownershipKeys(where)).toContain("assigned_to");
    // ...and the query terms live under AND, not as a competing top-level OR.
    const searchOr = where.AND[0].OR;
    expect(searchOr.length).toBeGreaterThan(0);
    for (const clause of searchOr) {
      const field = Object.keys(clause)[0];
      expect(clause[field]).toEqual({ contains: "acme", mode: "insensitive" });
    }
    expect(where.OR).not.toEqual(searchOr);
  });
});
