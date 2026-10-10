jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prismadb: {} }));
import { orderReadScopeWhere } from "@/lib/authz";

it("scopes reps to their orders and accounts (Review Focus 3)", () => {
  expect(orderReadScopeWhere({ id: "m", role: "manager" })).toEqual({});
  expect(orderReadScopeWhere({ id: "a", role: "admin" })).toEqual({});
  expect(orderReadScopeWhere({ id: "u", role: "user" })).toEqual({
    OR: [
      { ownerId: "u" },
      { createdBy: "u" },
      { account: { OR: [{ assigned_to: "u" }, { createdBy: "u" }, { watchers: { some: { user_id: "u" } } }] } },
    ],
  });
});
