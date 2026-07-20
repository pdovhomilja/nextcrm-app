// Object-level authorization regression tests for contract line-item actions
// (GHSA-qwhm-9fcm-p878). Line items authorize via the parent contract.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteContract: jest.fn(),
  assertCanWriteContractLineItem: jest.fn(),
  assertCanReadOpportunity: jest.fn(),
  assertCanReadContract: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "owner" } }),
}));
jest.mock("@/lib/create-safe-action", () => ({
  createSafeAction: (_schema: unknown, handler: any) => handler,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contracts: {
      findUnique: jest.fn().mockResolvedValue({ id: "ct-1", currency: "EUR", deletedAt: null }),
      update: jest.fn().mockResolvedValue({ id: "ct-1" }),
    },
    crm_Opportunities: {
      findUnique: jest.fn().mockResolvedValue({ id: "o-1", currency: "EUR", deletedAt: null }),
    },
    crm_ContractLineItems: {
      create: jest.fn().mockResolvedValue({ id: "cli-1" }),
      update: jest.fn().mockResolvedValue({ id: "cli-1" }),
      delete: jest.fn().mockResolvedValue({ id: "cli-1" }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue({
        id: "cli-1", contractId: "ct-1", quantity: 1, unit_price: 10,
        discount_type: "NONE", discount_value: 0,
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    crm_OpportunityLineItems: {
      findMany: jest.fn().mockResolvedValue([{ id: "src", sort_order: 0 }]),
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
  assertCanWriteContract,
  assertCanWriteContractLineItem,
  assertCanReadOpportunity,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { addContractLineItem } from "@/actions/crm/contract-line-items/add-line-item";
import { copyLineItemsFromOpportunity } from "@/actions/crm/contract-line-items/copy-from-opportunity";
import { updateContractLineItem } from "@/actions/crm/contract-line-items/update-line-item";
import { removeContractLineItem } from "@/actions/crm/contract-line-items/remove-line-item";
import { reorderContractLineItems } from "@/actions/crm/contract-line-items/reorder-line-items";

const authed = requireAuthenticated as jest.Mock;
const assertContract = assertCanWriteContract as jest.Mock;
const assertLI = assertCanWriteContractLineItem as jest.Mock;
const assertReadOpp = assertCanReadOpportunity as jest.Mock;
const cliCreate = prismadb.crm_ContractLineItems.create as jest.Mock;
const cliUpdate = prismadb.crm_ContractLineItems.update as jest.Mock;
const cliDelete = prismadb.crm_ContractLineItems.delete as jest.Mock;
const cliCreateMany = prismadb.crm_ContractLineItems.createMany as jest.Mock;
const cliFindMany = prismadb.crm_ContractLineItems.findMany as jest.Mock;
const tx = prismadb.$transaction as jest.Mock;

const OWNER = { id: "owner", role: "user" };
const ADD_INPUT = {
  contractId: "ct-1", name: "Item", quantity: 1, unit_price: "10",
  discount_type: "NONE", discount_value: "0", sort_order: 0,
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertContract.mockResolvedValue(undefined);
  assertLI.mockResolvedValue(undefined);
  assertReadOpp.mockResolvedValue(undefined);
});

describe("addContractLineItem", () => {
  it("denies when the parent contract is not writable and does not create", async () => {
    assertContract.mockRejectedValue(new AuthorizationError());
    const res = await addContractLineItem(ADD_INPUT);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertContract).toHaveBeenCalledWith(OWNER, "ct-1");
    expect(cliCreate).not.toHaveBeenCalled();
  });

  it("creates for a writable parent", async () => {
    const res = await addContractLineItem(ADD_INPUT);
    expect(res).toEqual({ data: { id: "cli-1" } });
    expect(cliCreate).toHaveBeenCalled();
  });
});

describe("copyLineItemsFromOpportunity (dual guard: write destination, read source)", () => {
  it("denies when the destination contract is not writable", async () => {
    assertContract.mockRejectedValue(new AuthorizationError());
    const res = await copyLineItemsFromOpportunity("ct-1", "o-1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(cliCreateMany).not.toHaveBeenCalled();
  });

  it("denies when the source opportunity is not readable", async () => {
    assertReadOpp.mockRejectedValue(new AuthorizationError());
    const res = await copyLineItemsFromOpportunity("ct-1", "o-1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(cliCreateMany).not.toHaveBeenCalled();
  });

  it("copies when destination is writable and source is readable", async () => {
    const res = await copyLineItemsFromOpportunity("ct-1", "o-1");
    expect(assertContract).toHaveBeenCalledWith(OWNER, "ct-1");
    expect(assertReadOpp).toHaveBeenCalledWith(OWNER, "o-1");
    expect(cliCreateMany).toHaveBeenCalled();
  });
});

describe("updateContractLineItem", () => {
  it("denies via the line-item parent guard and does not update", async () => {
    assertLI.mockRejectedValue(new AuthorizationError());
    const res = await updateContractLineItem({ id: "cli-1" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertLI).toHaveBeenCalledWith(OWNER, "cli-1");
    expect(cliUpdate).not.toHaveBeenCalled();
  });

  it("updates for a writable parent", async () => {
    await updateContractLineItem({ id: "cli-1" } as any);
    expect(cliUpdate).toHaveBeenCalled();
  });
});

describe("removeContractLineItem", () => {
  it("denies via the line-item parent guard and does not delete", async () => {
    assertLI.mockRejectedValue(new AuthorizationError());
    const res = await removeContractLineItem("cli-1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(cliDelete).not.toHaveBeenCalled();
  });

  it("deletes for a writable parent", async () => {
    await removeContractLineItem("cli-1");
    expect(cliDelete).toHaveBeenCalled();
  });
});

describe("reorderContractLineItems (blind — resolve and authorize every parent)", () => {
  it("denies the batch if any parent is not writable", async () => {
    cliFindMany.mockResolvedValue([
      { id: "a", contractId: "ct-1" },
      { id: "b", contractId: "ct-2" },
    ]);
    assertContract.mockImplementation(async (_u: any, ctId: string) => {
      if (ctId === "ct-2") throw new AuthorizationError();
    });
    const res = await reorderContractLineItems([
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
    ]);
    expect(res).toEqual({ error: "Forbidden" });
    expect(tx).not.toHaveBeenCalled();
  });

  it("denies when a supplied id does not resolve", async () => {
    cliFindMany.mockResolvedValue([{ id: "a", contractId: "ct-1" }]);
    const res = await reorderContractLineItems([
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
    ]);
    expect(res).toEqual({ error: "Forbidden" });
    expect(tx).not.toHaveBeenCalled();
  });

  it("reorders when every parent is writable", async () => {
    cliFindMany.mockResolvedValue([
      { id: "a", contractId: "ct-1" },
      { id: "b", contractId: "ct-1" },
    ]);
    const res = await reorderContractLineItems([
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
    ]);
    expect(res).toEqual({ data: { success: true } });
    expect(tx).toHaveBeenCalled();
  });
});
