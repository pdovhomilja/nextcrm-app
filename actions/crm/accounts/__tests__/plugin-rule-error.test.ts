jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1", role: "user" })),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/plugins/action-errors", () => ({
  pluginRuleErrorMessage: jest.fn(async (e: any) => (e?.name === "PluginRuleError" ? "Firma je chráněná do 1. 1. 2027" : null)),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      create: jest.fn(async () => { const e = new Error("rule"); e.name = "PluginRuleError"; throw e; }),
      findUnique: jest.fn().mockResolvedValue({ id: "acc-1" }),
      update: jest.fn(async () => { const e = new Error("rule"); e.name = "PluginRuleError"; throw e; }),
    },
  },
}));
import { createAccount } from "@/actions/crm/accounts/create-account";

it("returns the translated rule message instead of the generic error", async () => {
  await expect(createAccount({ name: "Acme" } as any)).resolves.toEqual({ error: "Firma je chráněná do 1. 1. 2027" });
});
