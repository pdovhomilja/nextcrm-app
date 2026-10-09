jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn().mockResolvedValue({ id: "u1", role: "user" }),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Accounts: { update: jest.fn().mockResolvedValue({ id: "acc-1" }), findUnique: jest.fn().mockResolvedValue({ id: "acc-1" }), create: jest.fn().mockResolvedValue({ id: "acc-1" }) } },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/plugins/action-errors", () => ({ pluginRuleErrorMessage: jest.fn(async () => null) }));

import { prismadb } from "@/lib/prisma";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";

const db = prismadb as unknown as { crm_Accounts: Record<string, jest.Mock> };

it("stores a chosen price list and clears it with an empty value (Review Focus 4)", async () => {
  await createAccount({ name: "A", pricelist_id: "L" } as never);
  expect(db.crm_Accounts.create).toHaveBeenCalledWith({ data: expect.objectContaining({ pricelist_id: "L" }) });
  await updateAccount({ id: "acc-1", name: "A", pricelist_id: "" } as never);
  expect(db.crm_Accounts.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pricelist_id: null }) }));
});
