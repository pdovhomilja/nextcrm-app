jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  isManagerOrAdmin: (u: { role: string }) => u.role === "manager" || u.role === "admin",
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Accounts: { update: jest.fn().mockResolvedValue({ id: "acc-1" }), findUnique: jest.fn().mockResolvedValue({ id: "acc-1", pricelist_id: "L" }), create: jest.fn().mockResolvedValue({ id: "acc-1" }) }, crm_PriceLists: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => ({ L: { id: "L", isActive: true }, M: { id: "M", isActive: true }, OLD: { id: "OLD", isActive: false } } as Record<string, unknown>)[where.id] ?? null) } },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/plugins/action-errors", () => ({ pluginRuleErrorMessage: jest.fn(async () => null) }));

import { prismadb } from "@/lib/prisma";
import { requireAuthenticated } from "@/lib/authz";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";

const db = prismadb as unknown as { crm_Accounts: Record<string, jest.Mock> };
const as = (role: string) => (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "u1", role });

beforeEach(() => jest.clearAllMocks());

it("stores a chosen price list and clears it with an empty value (Review Focus 4)", async () => {
  as("manager");
  await createAccount({ name: "A", pricelist_id: "L" } as never);
  expect(db.crm_Accounts.create).toHaveBeenCalledWith({ data: expect.objectContaining({ pricelist_id: "L" }) });
  await updateAccount({ id: "acc-1", name: "A", pricelist_id: "" } as never);
  expect(db.crm_Accounts.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pricelist_id: null }) }));
});

describe("only admin/manager choose an account's price list", () => {
  it.each(["user", "partner"])("%s changing the list is Forbidden and nothing is saved", async (role) => {
    as(role);
    expect(await updateAccount({ id: "acc-1", pricelist_id: "M" })).toEqual({ error: "Forbidden" });
    expect(await updateAccount({ id: "acc-1", pricelist_id: "" })).toEqual({ error: "Forbidden" });
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("a user saving the form with the stored list unchanged is fine", async () => {
    as("user");
    expect(await updateAccount({ id: "acc-1", name: "B", pricelist_id: "L" })).toHaveProperty("data");
  });

  it.each(["user", "partner"])("%s creating an account with a list is Forbidden", async (role) => {
    as(role);
    expect(await createAccount({ name: "A", pricelist_id: "L" })).toEqual({ error: "Forbidden" });
    expect(await createAccount({ name: "A", pricelist_id: "" })).toHaveProperty("data");
    expect(db.crm_Accounts.create).toHaveBeenCalledTimes(1);
  });

  it.each(["manager", "admin"])("%s may change the list", async (role) => {
    as(role);
    expect(await updateAccount({ id: "acc-1", pricelist_id: "M" })).toHaveProperty("data");
    expect(db.crm_Accounts.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pricelist_id: "M" }) }));
  });

  it("an inactive list is refused, even for an admin", async () => {
    as("admin");
    expect(await updateAccount({ id: "acc-1", pricelist_id: "OLD" })).toEqual({ error: "Price list not found" });
    expect(await createAccount({ name: "A", pricelist_id: "OLD" })).toEqual({ error: "Price list not found" });
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
    expect(db.crm_Accounts.create).not.toHaveBeenCalled();
  });
});
