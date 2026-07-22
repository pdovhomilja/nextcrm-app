// Object-level authorization regression tests for opportunity line-item actions
// (GHSA-qwhm-9fcm-p878). Line items carry no ownership column — authority is the
// parent opportunity. Denial tests must fail against the pre-guard code.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteOpportunity: jest.fn(),
  assertCanWriteOpportunityLineItem: jest.fn(),
  assertCanReadOpportunity: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "owner" } }),
}));
// Pass the safe-action handler through unwrapped so we can call it directly.
jest.mock("@/lib/create-safe-action", () => ({
  createSafeAction: (_schema: unknown, handler: any) => handler,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: {
      findUnique: jest.fn().mockResolvedValue({ id: "o-1", currency: "EUR", deletedAt: null }),
      update: jest.fn().mockResolvedValue({ id: "o-1" }),
    },
    crm_OpportunityLineItems: {
      create: jest.fn().mockResolvedValue({ id: "li-1" }),
      update: jest.fn().mockResolvedValue({ id: "li-1" }),
      delete: jest.fn().mockResolvedValue({ id: "li-1" }),
      findUnique: jest.fn().mockResolvedValue({
        id: "li-1", opportunityId: "o-1", quantity: 1, unit_price: 10,
        discount_type: "NONE", discount_value: 0,
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    crm_Products: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/line-items", () => ({
  calculateLineTotal: jest.fn(() => 10),
  sumLineTotals: jest.fn(() => 10),
}));

import {
  requireAuthenticated,
  assertCanWriteOpportunity,
  assertCanWriteOpportunityLineItem,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { addOpportunityLineItem } from "@/actions/crm/opportunity-line-items/add-line-item";
import { updateOpportunityLineItem } from "@/actions/crm/opportunity-line-items/update-line-item";
import { removeOpportunityLineItem } from "@/actions/crm/opportunity-line-items/remove-line-item";
import { reorderOpportunityLineItems } from "@/actions/crm/opportunity-line-items/reorder-line-items";

const authed = requireAuthenticated as jest.Mock;
const assertOpp = assertCanWriteOpportunity as jest.Mock;
const assertLI = assertCanWriteOpportunityLineItem as jest.Mock;
const liCreate = prismadb.crm_OpportunityLineItems.create as jest.Mock;
const liUpdate = prismadb.crm_OpportunityLineItems.update as jest.Mock;
const liDelete = prismadb.crm_OpportunityLineItems.delete as jest.Mock;
const liFindMany = prismadb.crm_OpportunityLineItems.findMany as jest.Mock;
const tx = prismadb.$transaction as jest.Mock;

const OWNER = { id: "owner", role: "user" };
const ADD_INPUT = {
  opportunityId: "o-1", name: "Item", quantity: 1, unit_price: "10",
  discount_type: "NONE", discount_value: "0", sort_order: 0,
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertOpp.mockResolvedValue(undefined);
  assertLI.mockResolvedValue(undefined);
});

describe("addOpportunityLineItem", () => {
  it("denies when the parent opportunity is not writable and does not create", async () => {
    assertOpp.mockRejectedValue(new AuthorizationError());
    const res = await addOpportunityLineItem(ADD_INPUT);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertOpp).toHaveBeenCalledWith(OWNER, "o-1");
    expect(liCreate).not.toHaveBeenCalled();
  });

  it("creates for a writable parent", async () => {
    const res = await addOpportunityLineItem(ADD_INPUT);
    expect(res).toEqual({ data: { id: "li-1" } });
    expect(liCreate).toHaveBeenCalled();
  });
});

describe("updateOpportunityLineItem", () => {
  it("denies via the line-item parent guard and does not update", async () => {
    assertLI.mockRejectedValue(new AuthorizationError());
    const res = await updateOpportunityLineItem({ id: "li-1" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertLI).toHaveBeenCalledWith(OWNER, "li-1");
    expect(liUpdate).not.toHaveBeenCalled();
  });

  it("updates for a writable parent", async () => {
    await updateOpportunityLineItem({ id: "li-1" } as any);
    expect(liUpdate).toHaveBeenCalled();
  });
});

describe("removeOpportunityLineItem", () => {
  it("denies via the line-item parent guard and does not delete", async () => {
    assertLI.mockRejectedValue(new AuthorizationError());
    const res = await removeOpportunityLineItem("li-1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertLI).toHaveBeenCalledWith(OWNER, "li-1");
    expect(liDelete).not.toHaveBeenCalled();
  });

  it("deletes for a writable parent", async () => {
    await removeOpportunityLineItem("li-1");
    expect(liDelete).toHaveBeenCalled();
  });
});

describe("reorderOpportunityLineItems (blind — must resolve and authorize every parent)", () => {
  it("denies the whole batch if any parent is not writable, and does not run the transaction", async () => {
    liFindMany.mockResolvedValue([
      { id: "a", opportunityId: "o-1" },
      { id: "b", opportunityId: "o-2" },
    ]);
    assertOpp.mockImplementation(async (_u: any, oppId: string) => {
      if (oppId === "o-2") throw new AuthorizationError();
    });
    const res = await reorderOpportunityLineItems([
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
    ]);
    expect(res).toEqual({ error: "Forbidden" });
    expect(tx).not.toHaveBeenCalled();
  });

  it("denies when a supplied id does not resolve to a line item", async () => {
    liFindMany.mockResolvedValue([{ id: "a", opportunityId: "o-1" }]); // "b" missing
    const res = await reorderOpportunityLineItems([
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
    ]);
    expect(res).toEqual({ error: "Forbidden" });
    expect(tx).not.toHaveBeenCalled();
  });

  it("reorders when every parent is writable", async () => {
    liFindMany.mockResolvedValue([
      { id: "a", opportunityId: "o-1" },
      { id: "b", opportunityId: "o-1" },
    ]);
    const res = await reorderOpportunityLineItems([
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
    ]);
    expect(res).toEqual({ data: { success: true } });
    expect(tx).toHaveBeenCalled();
  });
});
