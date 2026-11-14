// An external system that syncs accounts over MCP needs to store company
// identifiers, addresses and its own record id, and to find an existing account
// by those exact values instead of creating duplicates.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    crm_Contacts: { create: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { crmAccountTools } from "@/lib/mcp/tools/crm-accounts";
import { crmContactTools } from "@/lib/mcp/tools/crm-contacts";

type Role = "user" | "manager" | "admin";
const ADMIN = { id: "a1", role: "admin" as Role };

const allTools = [...crmAccountTools, ...crmContactTools];
const tool = (name: string) => {
  const t = allTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
};
// Parse through the zod schema first, as the MCP server does, so a field the
// schema does not declare is stripped exactly like in production.
const run = (name: string, args: any, user: { id: string; role: Role } = ADMIN) => {
  const t = tool(name);
  return (t.handler as any)((t.schema as any).parse(args), user.id, user);
};

const accounts = prismadb.crm_Accounts as any;
const contacts = prismadb.crm_Contacts as any;

const ID = "11111111-1111-4111-8111-111111111111";
const ACC = "22222222-2222-4222-8222-222222222222";

const FIELDS = {
  company_id: "27074358",
  vat: "CZ27074358",
  billing_street: "Main 1",
  billing_city: "Prague",
  billing_postal_code: "11000",
  billing_country: "CZ",
  shipping_street: "Dock 2",
  shipping_city: "Brno",
  shipping_postal_code: "60200",
  shipping_country: "CZ",
  external_ref: "portal-42",
};

beforeEach(() => {
  jest.clearAllMocks();
  accounts.findFirst.mockResolvedValue({ id: ID });
  accounts.findMany.mockResolvedValue([]);
  accounts.count.mockResolvedValue(0);
  accounts.create.mockResolvedValue({ id: ID });
  accounts.update.mockResolvedValue({ id: ID });
  contacts.create.mockResolvedValue({ id: "c1" });
});

describe("crm_create_account identifiers and addresses", () => {
  it("persists company ids, addresses and external_ref", async () => {
    await run("crm_create_account", { name: "Acme", ...FIELDS });
    expect(accounts.create.mock.calls[0][0].data).toMatchObject({ name: "Acme", ...FIELDS });
  });
});

describe("crm_update_account identifiers and addresses", () => {
  it("persists company ids, addresses and external_ref", async () => {
    await run("crm_update_account", { id: ID, ...FIELDS });
    expect(accounts.update.mock.calls[0][0].data).toMatchObject(FIELDS);
  });

  it("omitting the fields leaves them untouched", async () => {
    await run("crm_update_account", { id: ID, name: "Renamed" });
    const data = accounts.update.mock.calls[0][0].data;
    for (const key of Object.keys(FIELDS)) expect(data).not.toHaveProperty(key);
  });
});

describe("crm_search_accounts exact-match filters", () => {
  const whereOf = () => accounts.findMany.mock.calls[0][0].where;

  it("finds by exact external_ref without a text query", async () => {
    await run("crm_search_accounts", { external_ref: "portal-42" });
    expect(whereOf().AND).toEqual([{ external_ref: "portal-42" }]);
    expect(accounts.count.mock.calls[0][0].where).toEqual(whereOf());
  });

  it("finds by exact company_id and vat together", async () => {
    await run("crm_search_accounts", { company_id: "27074358", vat: "CZ27074358" });
    expect(whereOf().AND).toEqual([{ company_id: "27074358" }, { vat: "CZ27074358" }]);
  });

  it("combines a text query with an exact filter", async () => {
    await run("crm_search_accounts", { query: "acme", company_id: "27074358" });
    const and = whereOf().AND;
    expect(and).toHaveLength(2);
    expect(and[0]).toHaveProperty("OR");
    expect(and[1]).toEqual({ company_id: "27074358" });
  });

  it("keeps the read scope next to the filters", async () => {
    await run("crm_search_accounts", { external_ref: "portal-42" }, { id: "u1", role: "user" });
    const where = whereOf();
    expect(where.deletedAt).toBeNull();
    expect(where.OR).toBeDefined();
    expect(where.AND).toEqual([{ external_ref: "portal-42" }]);
  });

  it("rejects a call with neither a query nor a filter", async () => {
    await expect(run("crm_search_accounts", {})).rejects.toThrow("VALIDATION_ERROR");
    expect(accounts.findMany).not.toHaveBeenCalled();
  });

  it("still searches by name or website as before", async () => {
    await run("crm_search_accounts", { query: "acme" });
    expect(whereOf().AND).toHaveLength(1);
    expect(whereOf().AND[0]).toHaveProperty("OR");
  });
});

describe("crm_create_contact account link", () => {
  it("links the new contact through the relation FK (accountsIDs)", async () => {
    await run("crm_create_contact", { last_name: "Novak", account: ACC });
    const data = contacts.create.mock.calls[0][0].data;
    expect(data.accountsIDs).toBe(ACC);
    expect(data).not.toHaveProperty("account");
  });

  it("rejects an unknown or soft-deleted account instead of writing a dangling FK", async () => {
    accounts.findFirst.mockResolvedValue(null);
    await expect(run("crm_create_contact", { last_name: "Novak", account: ACC })).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(accounts.findFirst.mock.calls[0][0].where.deletedAt).toBeNull();
    expect(contacts.create).not.toHaveBeenCalled();
  });

  it("omitting account creates an unlinked contact", async () => {
    await run("crm_create_contact", { last_name: "Novak" });
    expect(contacts.create.mock.calls[0][0].data).not.toHaveProperty("accountsIDs");
    expect(accounts.findFirst).not.toHaveBeenCalled();
  });
});
