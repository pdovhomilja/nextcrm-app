/**
 * Deny by default, with per-role expectations (partner-role spec, 2026-10-18).
 *
 * Every helper in the authz scope modules must treat a role it does not
 * explicitly handle as "no rows / refused". An unknown role stands in for the
 * next role someone adds: every helper must deny it. `partner` is handled
 * explicitly: the helpers in PARTNER_READS give him a partner-shaped scope
 * (through partnerUserId / his own account, never createdBy, assigned_to,
 * watchers or public visibility); every other helper must deny him.
 *
 * The database mock below is maximally permissive: every lookup finds a row
 * that the caller "owns" (unless the where matches nothing) and records the
 * where it got. A helper that falls through to the user branch therefore
 * passes the lookup, and this test fails. New exports are picked up
 * automatically and expected to deny a partner until listed in PARTNER_READS.
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

// Like Prisma, a where whose top-level OR is NO_ROWS matches nothing (checked
// against Postgres in the PR evidence); anything else finds the owned row.
// Every where is recorded so partner reads can be inspected.
const mockWheres: unknown[] = [];
jest.mock("@/lib/prisma", () => {
  const { NO_ROWS } = jest.requireActual("../scopes/unhandled-role");
  const matchesNothing = (args?: { where?: { OR?: unknown[] } }) => {
    mockWheres.push(args?.where);
    return JSON.stringify(args?.where?.OR) === JSON.stringify(NO_ROWS.OR);
  };
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
import { NO_ROWS } from "../scopes/unhandled-role";
import { isAdmin, isManagerOrAdmin } from "../session";
import * as invoicePermissions from "@/lib/invoices/permissions";

// Building blocks that take no user (they cannot branch on a role).
const ROLE_FREE_EXPORTS = new Set(["accountUserScopeOR"]);

// The only helpers that give a partner rows (ticket 2: read only). Every other
// helper, and every write, must deny him.
const PARTNER_READS = new Set([
  "crm.accountReadScopeWhere", "crm.assertCanReadAccount", "crm.filterAuthorizedAccountIds",
  "crm.contactReadScopeWhere", "crm.assertCanReadContact", "crm.filterAuthorizedContactIds",
  "crm.leadReadScopeWhere", "crm.assertCanReadLead", "crm.filterAuthorizedLeadIds",
  "crm.opportunityReadScopeWhere", "crm.assertCanReadOpportunity", "crm.filterAuthorizedOpportunityIds",
  "crm.contractReadScopeWhere", "crm.assertCanReadContract",
  "crm.documentReadScopeWhere", "crm.assertCanReadDocument", "crm.filterAuthorizedDocumentIds",
  "crm.crmTaskReadScopeWhere",
  "orders.orderReadScopeWhere",
]);
// Reads that also reach his own company account (Pavel 2026-10-18: the
// account record, its contacts, orders and invoices). Every other partner
// scope is through partnerUserId only.
const PARTNER_WITH_OWN_ACCOUNT = new Set([
  "crm.accountReadScopeWhere", "crm.assertCanReadAccount", "crm.filterAuthorizedAccountIds",
  "crm.contactReadScopeWhere", "crm.assertCanReadContact", "crm.filterAuthorizedContactIds",
  "orders.orderReadScopeWhere", "report.account", "report.contact", "invoiceReadScopeWhere",
]);
// Partner writes: allowed only with PARTNER_EDIT, always through partnerUserId
// (never his own company account). assertPartnerCanLinkActivity is the
// activity-link check those writes share.
const PARTNER_EDITS = new Set([
  "crm.assertCanWriteAccount", "crm.assertCanWriteContact", "crm.assertCanWriteLead",
  "crm.assertCanWriteOpportunity", "crm.assertCanWriteCrmTask",
]);
// assertCanReadActivityForEntity: partner reads activities of these entity types only.
const PARTNER_ACTIVITY_TYPES = new Set(["account", "lead", "contact", "opportunity", "contract"]);

// A partner scope names his link and none of the internal ownership columns.
const NOT_FOR_PARTNERS = [
  "assigned_to", "createdBy", "created_by", "created_by_user", "assigned_user",
  "watchers", "visibility", "user", "ownerId", "sharedWith", "triggeredBy",
];

// Keys a where filters on. An exclusion (`NOT`) grants nothing, so its keys
// are skipped: partnerAccountWhere excludes his own account that way.
function keysOf(value: unknown, out = new Set<string>()): Set<string> {
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "NOT") continue;
      out.add(k);
      keysOf(v, out);
    }
  }
  return out;
}

function expectPartnerScoped(where: unknown, label: string, ownAccount = PARTNER_WITH_OWN_ACCOUNT.has(label)) {
  const keys = keysOf(where);
  expect({ label, partnerUserId: keys.has("partnerUserId"), ownAccount: keys.has("partner_own_users") })
    .toEqual({ label, partnerUserId: true, ownAccount });
  expect({ label, internal: NOT_FOR_PARTNERS.filter((k) => keys.has(k)) }).toEqual({ label, internal: [] });
  expect({ label, JSON: JSON.stringify(where).includes(ME) }).toEqual({ label, JSON: true });
}

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
  if (name === "assertPartnerCanLinkActivity") return [[user, [{ entityType: "account", entityId: "row-1" }]]];
  if (name === "assertCanWritePriceList") return [[user, { source: "CRM" }]];
  return [[user, "row-1"]];
}

/** A Prisma where that matches nothing. */
function expectNoRowsWhere(where: unknown, label: string) {
  expect({ label, where }).toMatchObject({ label, where: NO_ROWS });
}

function call(fn: (...a: unknown[]) => unknown, args: unknown[]): unknown {
  try {
    return fn(...args);
  } catch (e) {
    return Promise.reject(e);
  }
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

// Allowed partner read: a where builder returns a partner scope; an assert or
// filter resolves, and every where it sent to the DB is a partner scope.
async function expectPartnerRead(label: string, fn: (...a: unknown[]) => unknown, args: unknown[], ownAccount: boolean) {
  mockWheres.length = 0;
  const result = call(fn, args);
  if (!(result instanceof Promise)) return expectPartnerScoped(result, label, ownAccount);
  await expect(result).resolves.not.toBe(false);
  expect({ label, queries: mockWheres.length > 0 }).toEqual({ label, queries: true });
  for (const where of mockWheres) expectPartnerScoped(where, label, ownAccount);
}

const modules = { crm, orders, pricing } as Record<string, Record<string, unknown>>;
const helpers = Object.entries(modules).flatMap(([mod, exports]) =>
  Object.entries(exports)
    .filter(([name, fn]) => typeof fn === "function" && !ROLE_FREE_EXPORTS.has(name))
    .map(([name, fn]) => [`${mod}.${name}`, name, fn as (...a: unknown[]) => unknown] as const),
);

it("finds the scope helpers to check, and every PARTNER_READS entry exists", () => {
  expect(helpers.length).toBeGreaterThan(40);
  const labels = new Set<string>(helpers.map(([label]) => label));
  expect(Array.from(PARTNER_READS).filter((l) => !labels.has(l))).toEqual([]);
});

describe("an unknown role is denied by every helper", () => {
  const user: AuthzUser = { id: ME, role: "some-future-role" as AppRole };

  it.each(helpers)("%s gives no rows / refuses", async (label, name, fn) => {
    for (const args of argsFor(name, user)) {
      await expectDenied(`${label}(${String(args[1])})`, call(fn, args));
    }
  });

  it("report scope: every entity fragment matches nothing, no user directory", () => {
    const { allowUserDirectory, ...fragments } = getReportScope(user);
    expect(allowUserDirectory).toBe(false);
    for (const [entity, where] of Object.entries(fragments)) {
      expectNoRowsWhere(where, `report.${entity}`);
    }
  });

  it("invoices: no rows", () => {
    expectNoRowsWhere(invoicePermissions.invoiceReadScopeWhere(user), "invoiceReadScopeWhere");
  });
});

describe("partner: his own read scope, everything else denied", () => {
  const user: AuthzUser = { id: ME, role: "partner" };

  it.each(helpers)("%s", async (label, name, fn) => {
    for (const args of argsFor(name, user)) {
      const call_ = `${label}(${String(args[1])})`;
      const reads =
        name === "assertCanReadActivityForEntity"
          ? PARTNER_ACTIVITY_TYPES.has(String(args[1]))
          : PARTNER_READS.has(label);
      if (reads) await expectPartnerRead(call_, fn, args, PARTNER_WITH_OWN_ACCOUNT.has(label));
      else if (name === "assertPartnerCanLinkActivity") await expectPartnerRead(call_, fn, args, false);
      else await expectDenied(call_, call(fn, args));
    }
  });

  // assertCanWriteActivity reads the activity's links first (no partner
  // where of its own); its partner rule is proven against Postgres in
  // __tests__/authz/partner-read-scope.test.ts.
  it.each(helpers.filter(([label]) => /Write/.test(label) && label !== "crm.assertCanWriteActivity"))(
    "%s with PARTNER_EDIT: partner-scoped if a partner edit, else still refused",
    async (label, name, fn) => {
      for (const [u, ...rest] of argsFor(name, user)) {
        const args = [u, ...rest, { partnerEdit: true }];
        if (PARTNER_EDITS.has(label)) await expectPartnerRead(label, fn, args, false);
        else await expectDenied(label, call(fn, args));
      }
    },
  );

  it("report scope: CRM fragments through his accounts; projects tasks, campaigns, directory: none", () => {
    const { allowUserDirectory, task, campaign, ...crmFragments } = getReportScope(user);
    expect(allowUserDirectory).toBe(false);
    expectNoRowsWhere(task, "report.task");
    expectNoRowsWhere(campaign, "report.campaign");
    expect(Object.keys(crmFragments).sort()).toEqual(["account", "contact", "lead", "opportunity"]);
    for (const [entity, where] of Object.entries(crmFragments)) {
      expectPartnerScoped(where, `report.${entity}`);
    }
  });

  it("invoices: read through his accounts", () => {
    expectPartnerScoped(invoicePermissions.invoiceReadScopeWhere(user), "invoiceReadScopeWhere");
  });
});

describe.each(["partner", "some-future-role"] as AppRole[])("role %s", (role) => {
  const user: AuthzUser = { id: ME, role };

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
  it("a user scope is not partner-shaped (the partner check can fail)", () => {
    expect(keysOf(crm.accountReadScopeWhere(user)).has("partnerUserId")).toBe(false);
  });
});
