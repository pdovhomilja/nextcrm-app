/**
 * Deny by default (partner-role spec, 2026-10-18).
 *
 * Every helper in the authz scope modules must treat a role it does not
 * explicitly handle as "no rows / refused". `partner` has no branch yet
 * (read scope is a later ticket), and an unknown role stands in for the next
 * role someone adds. Neither may fall into the `user` (or admin/manager) rules.
 *
 * The database mock below is maximally permissive: every lookup finds a row
 * that the caller "owns" (unless the where matches nothing). A helper that falls through to the user branch
 * therefore passes, and this test fails. New exports are picked up
 * automatically: add a helper and it is checked here without editing this file.
 */
import { AuthorizationError } from "../errors";
import type { AppRole } from "../roles";
import type { AuthzUser } from "../session";

const ME = "11111111-1111-1111-1111-111111111111";

const ownedRow = {
  id: "row-1",
  createdBy: ME,
  triggeredBy: ME,
  user: ME,
  opportunityId: "opp-1",
  contractId: "con-1",
  assigned_section: { board_relation: { id: "board-1" } },
};

// Like Prisma, a where with an empty top-level OR matches nothing (checked
// against Postgres in the PR evidence); anything else finds the owned row.
jest.mock("@/lib/prisma", () => {
  const matchesNothing = (args?: { where?: { OR?: unknown[] } }) =>
    Array.isArray(args?.where?.OR) && args.where.OR.length === 0;
  const method = (name: string) => {
    if (name === "findMany") return jest.fn(async (a) => (matchesNothing(a) ? [] : [ownedRow]));
    if (name === "updateMany") return jest.fn(async (a) => ({ count: matchesNothing(a) ? 0 : 1 }));
    return jest.fn(async (a) => (matchesNothing(a) ? null : ownedRow));
  };
  const model = () =>
    new Proxy({} as Record<string, jest.Mock>, {
      get: (target, name: string) => (target[name] ??= method(name)),
    });
  const models: Record<string, unknown> = {};
  return {
    prismadb: new Proxy(models, {
      get: (target, name: string) => (target[name] ??= model()),
    }),
  };
});

jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import * as crm from "../scopes/crm";
import * as orders from "../scopes/orders";
import * as pricing from "../scopes/pricing";
import { getReportScope } from "../scopes/report-scope";
import { isAdmin, isManagerOrAdmin } from "../session";
import * as invoicePermissions from "@/lib/invoices/permissions";

// Building blocks that take no user (they cannot branch on a role).
const ROLE_FREE_EXPORTS = new Set(["accountUserScopeOR"]);

const ACTIVITY_ENTITY_TYPES = [
  "account", "lead", "contact", "opportunity", "contract", "target",
  "target_list", "something-new",
];

function argsFor(name: string, user: AuthzUser): unknown[][] {
  if (name.startsWith("filterAuthorized")) return [[user, ["row-1"]]];
  if (name.startsWith("tryScopedUpdate")) return [[user, "row-1", { name: "x" }]];
  if (name === "assertCanReadActivityForEntity") {
    return ACTIVITY_ENTITY_TYPES.map((t) => [user, t, "row-1"]);
  }
  if (name === "assertCanWritePriceList") return [[user, { source: "CRM" }]];
  return [[user, "row-1"]];
}

/** A Prisma where that matches nothing: an empty OR. */
function expectNoRowsWhere(where: unknown, label: string) {
  expect({ label, where }).toMatchObject({ label, where: { OR: [] } });
}

async function expectDenied(label: string, result: unknown) {
  if (result instanceof Promise) {
    let value: unknown;
    try {
      value = await result;
    } catch (e) {
      expect({ label, error: e instanceof AuthorizationError }).toEqual({ label, error: true });
      return;
    }
    // Promises that do not throw must return nothing usable.
    expect({ label, value }).toEqual({ label, value: Array.isArray(value) ? [] : false });
    return;
  }
  expectNoRowsWhere(result, label);
}

const unhandledRoles: AppRole[] = ["partner", "some-future-role" as AppRole];

describe.each(unhandledRoles)("role %s is denied by default", (role) => {
  const user: AuthzUser = { id: ME, role };

  const modules = { crm, orders, pricing } as Record<string, Record<string, unknown>>;
  const helpers = Object.entries(modules).flatMap(([mod, exports]) =>
    Object.entries(exports)
      .filter(([name, fn]) => typeof fn === "function" && !ROLE_FREE_EXPORTS.has(name))
      .map(([name, fn]) => [`${mod}.${name}`, name, fn as (...a: unknown[]) => unknown] as const),
  );

  it("finds the scope helpers to check", () => {
    expect(helpers.length).toBeGreaterThan(40);
  });

  it.each(helpers)("%s gives no rows / refuses", async (label, name, fn) => {
    for (const args of argsFor(name, user)) {
      let result: unknown;
      try {
        result = fn(...args);
      } catch (e) {
        result = Promise.reject(e);
      }
      await expectDenied(`${label}(${String(args[1])})`, result);
    }
  });

  it("report scope: every entity fragment matches nothing, no user directory", () => {
    const scope = getReportScope(user);
    const { allowUserDirectory, ...fragments } = scope;
    expect(allowUserDirectory).toBe(false);
    for (const [entity, where] of Object.entries(fragments)) {
      expectNoRowsWhere(where, `report.${entity}`);
    }
  });

  it("invoice permissions: nothing allowed even on his own draft/issued invoice", () => {
    const fns = Object.entries(invoicePermissions).filter(
      ([name, fn]) => typeof fn === "function" && name.startsWith("can"),
    ) as [string, (i: unknown, u: unknown) => boolean][];
    expect(fns.length).toBeGreaterThan(0);
    for (const status of ["DRAFT", "ISSUED"]) {
      for (const [name, fn] of fns) {
        expect({ name, status, allowed: fn({ status, createdBy: ME }, user) }).toEqual({
          name, status, allowed: false,
        });
      }
    }
  });

  it("is neither admin nor manager", () => {
    expect(isAdmin(user)).toBe(false);
    expect(isManagerOrAdmin(user)).toBe(false);
  });
});

// Guard the guard: the same permissive mock lets a real user through, so the
// denials above come from the role check, not from the mock.
describe("control: role user passes on rows he owns", () => {
  const user: AuthzUser = { id: ME, role: "user" };
  it("assertCanWriteAccount resolves", async () => {
    await expect(crm.assertCanWriteAccount(user, "row-1")).resolves.toBeUndefined();
  });
  it("accountReadScopeWhere has a non-empty OR", () => {
    expect((crm.accountReadScopeWhere(user) as { OR?: unknown[] }).OR?.length).toBeGreaterThan(0);
  });
  it("invoice: can read his own invoice", () => {
    expect(invoicePermissions.canReadInvoice({ status: "DRAFT", createdBy: ME }, user)).toBe(true);
  });
});
