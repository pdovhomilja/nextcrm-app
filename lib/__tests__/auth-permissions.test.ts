// BetterAuth's admin plugin uses these roles only to gate its own
// /api/auth/admin/* endpoints, which NextCRM does not use. App permissions
// live in lib/authz; these roles must not open a side door around them.
// (better-auth ships ESM that Jest does not transform, so the access-control
// factory is replaced by one that records what each role is granted.)
jest.mock("better-auth/plugins/access", () => ({
  createAccessControl: (statements: unknown) => ({
    statements,
    newRole: (grants: Record<string, readonly string[]>) => ({ grants }),
  }),
}));

import { ac, admin, manager, user } from "@/lib/auth-permissions";

describe("BetterAuth access-control roles", () => {
  it("declare only the admin plugin's own resources, no app permissions", () => {
    expect(Object.keys((ac as any).statements).sort()).toEqual(["session", "user"]);
  });

  it.each([
    ["admin", admin],
    ["manager", manager],
    ["user", user],
  ])("%s is granted no BetterAuth admin endpoint", (_, role) => {
    const grants = (role as any).grants as Record<string, readonly string[]>;
    expect(Object.values(grants).flat()).toEqual([]);
  });
});
