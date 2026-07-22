// crm_update_opportunity / crm_update_contact used to whitelist only scalar
// fields, so an `account` (or `contact`) FK passed by an API client was stripped
// by schema validation and silently dropped — the call returned 200 with the
// column still null. These tests pin the link/unlink contract.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { findFirst: jest.fn(), update: jest.fn() },
    crm_Accounts: { findFirst: jest.fn(), update: jest.fn() },
    crm_Contacts: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { crmOpportunityTools } from "@/lib/mcp/tools/crm-opportunities";
import { crmContactTools } from "@/lib/mcp/tools/crm-contacts";

type Role = "user" | "manager" | "admin";
const ADMIN = { id: "a1", role: "admin" as Role };

const allTools = [...crmOpportunityTools, ...crmContactTools];
const run = (name: string, args: any, user: { id: string; role: Role } = ADMIN) => {
  const t = allTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return (t.handler as any)(args, user.id, user);
};

const opps = prismadb.crm_Opportunities as any;
const accounts = prismadb.crm_Accounts as any;
const contacts = prismadb.crm_Contacts as any;

// Every lookup resolves by default; individual tests override what they exercise.
beforeEach(() => {
  jest.clearAllMocks();
  opps.findFirst.mockResolvedValue({ id: "o1" });
  opps.update.mockResolvedValue({ id: "o1" });
  accounts.findFirst.mockResolvedValue({ id: "acc1" });
  contacts.findFirst.mockResolvedValue({ id: "c1" });
  contacts.update.mockResolvedValue({ id: "c1" });
});

describe("crm_update_opportunity account/contact linking", () => {
  it("accepts the schema fields at all (they used to be stripped)", () => {
    const schema = crmOpportunityTools.find((t) => t.name === "crm_update_opportunity")!
      .schema as any;
    const parsed = schema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      account: "22222222-2222-4222-8222-222222222222",
      contact: "33333333-3333-4333-8333-333333333333",
    });
    expect(parsed.account).toBe("22222222-2222-4222-8222-222222222222");
    expect(parsed.contact).toBe("33333333-3333-4333-8333-333333333333");
  });

  it("persists the account FK", async () => {
    await run("crm_update_opportunity", { id: "o1", account: "acc1" });
    expect(opps.update.mock.calls[0][0].data.account).toBe("acc1");
  });

  it("persists the contact FK", async () => {
    await run("crm_update_opportunity", { id: "o1", contact: "c1" });
    expect(opps.update.mock.calls[0][0].data.contact).toBe("c1");
  });

  it("re-links to a different account", async () => {
    await run("crm_update_opportunity", { id: "o1", account: "acc1" });
    await run("crm_update_opportunity", { id: "o1", account: "acc2" });
    expect(opps.update.mock.calls[0][0].data.account).toBe("acc1");
    expect(opps.update.mock.calls[1][0].data.account).toBe("acc2");
  });

  it("explicit null unlinks without validating a non-existent parent", async () => {
    await run("crm_update_opportunity", { id: "o1", account: null, contact: null });
    const data = opps.update.mock.calls[0][0].data;
    expect(data.account).toBeNull();
    expect(data.contact).toBeNull();
    expect(accounts.findFirst).not.toHaveBeenCalled();
  });

  it("omitting the fields leaves the existing links untouched", async () => {
    await run("crm_update_opportunity", { id: "o1", name: "renamed" });
    const data = opps.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("account");
    expect(data).not.toHaveProperty("contact");
  });

  it("rejects an unknown account instead of writing a dangling FK", async () => {
    accounts.findFirst.mockResolvedValue(null);
    await expect(
      run("crm_update_opportunity", { id: "o1", account: "ghost" })
    ).rejects.toThrow("NOT_FOUND");
    expect(opps.update).not.toHaveBeenCalled();
  });

  it("rejects a soft-deleted account", async () => {
    accounts.findFirst.mockResolvedValue(null);
    await expect(
      run("crm_update_opportunity", { id: "o1", account: "acc1" })
    ).rejects.toThrow("NOT_FOUND");
    // The existence check must exclude soft-deleted rows.
    expect(accounts.findFirst.mock.calls[0][0].where.deletedAt).toBeNull();
    expect(opps.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown contact instead of writing a dangling FK", async () => {
    contacts.findFirst.mockResolvedValue(null);
    await expect(
      run("crm_update_opportunity", { id: "o1", contact: "ghost" })
    ).rejects.toThrow("NOT_FOUND");
    expect(opps.update).not.toHaveBeenCalled();
  });

  it("checks the opportunity is writable before touching the parent", async () => {
    opps.findFirst.mockResolvedValue(null);
    await expect(
      run("crm_update_opportunity", { id: "victim", account: "acc1" })
    ).rejects.toThrow("NOT_FOUND");
    expect(accounts.findFirst).not.toHaveBeenCalled();
    expect(opps.update).not.toHaveBeenCalled();
  });
});

describe("crm_update_contact account linking", () => {
  it("writes the relation FK (accountsIDs), not the legacy `account` column", async () => {
    await run("crm_update_contact", { id: "c1", account: "acc1" });
    const data = contacts.update.mock.calls[0][0].data;
    expect(data.accountsIDs).toBe("acc1");
    expect(data).not.toHaveProperty("account");
  });

  it("explicit null unlinks", async () => {
    await run("crm_update_contact", { id: "c1", account: null });
    expect(contacts.update.mock.calls[0][0].data.accountsIDs).toBeNull();
    expect(accounts.findFirst).not.toHaveBeenCalled();
  });

  it("omitting account leaves the link untouched", async () => {
    await run("crm_update_contact", { id: "c1", last_name: "Novak" });
    expect(contacts.update.mock.calls[0][0].data).not.toHaveProperty("accountsIDs");
  });

  it("rejects an unknown account instead of writing a dangling FK", async () => {
    accounts.findFirst.mockResolvedValue(null);
    await expect(run("crm_update_contact", { id: "c1", account: "ghost" })).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(contacts.update).not.toHaveBeenCalled();
  });
});
