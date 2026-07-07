import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contracts: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    crm_Products: {
      findUnique: vi.fn(),
    },
    crm_ContractLineItems: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/create-safe-action", () => ({
  createSafeAction: vi.fn((_schema, handler) => {
    return (data: any) => handler(data);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { addContractLineItem } from "@/actions/crm/contract-line-items/add-line-item";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("addContractLineItem unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      unit_price: 100,
      status: "ACTIVE",
    });
    (prismadb.crm_Contracts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      currency: "EUR",
    });
    (prismadb.crm_ContractLineItems.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "li1",
    });
    (prismadb.crm_ContractLineItems.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
    });
  });

  it("rejects line item with invalid discount_type", async () => {
    const result = await addContractLineItem({
      contractId: "c1",
      productId: "p1",
      name: "Invalid Discount Type Item",
      quantity: 1,
      unit_price: "100.00",
      discount_type: "INVALID_DISCOUNT_TYPE" as string as "PERCENTAGE",
      discount_value: "10.00",
      sort_order: 0,
    });
    expect(result.error).toBeDefined();
  });

  it("rejects line item with quantity less than or equal to 0", async () => {
    const resultZero = await addContractLineItem({
      contractId: "c1",
      productId: "p1",
      name: "Zero Qty Item",
      quantity: 0,
      unit_price: "100.00",
      discount_type: "PERCENTAGE",
      discount_value: "0",
      sort_order: 0,
    });
    expect(resultZero.error).toBeDefined();

    const resultNegative = await addContractLineItem({
      contractId: "c1",
      productId: "p1",
      name: "Negative Qty Item",
      quantity: -5,
      unit_price: "100.00",
      discount_type: "PERCENTAGE",
      discount_value: "0",
      sort_order: 0,
    });
    expect(resultNegative.error).toBeDefined();
  });

  it("rejects line item with unit_price less than or equal to 0", async () => {
    const resultZero = await addContractLineItem({
      contractId: "c1",
      productId: "p1",
      name: "Zero Price Item",
      quantity: 1,
      unit_price: "0.00",
      discount_type: "PERCENTAGE",
      discount_value: "0",
      sort_order: 0,
    });
    expect(resultZero.error).toBeDefined();

    const resultNegative = await addContractLineItem({
      contractId: "c1",
      productId: "p1",
      name: "Negative Price Item",
      quantity: 1,
      unit_price: "-50.00",
      discount_type: "PERCENTAGE",
      discount_value: "0",
      sort_order: 0,
    });
    expect(resultNegative.error).toBeDefined();
  });

  it("rejects line item with discount exceeding 100% or line total", async () => {
    const resultPercent = await addContractLineItem({
      contractId: "c1",
      productId: "p1",
      name: "Excessive Percent Discount Item",
      quantity: 1,
      unit_price: "100.00",
      discount_type: "PERCENTAGE",
      discount_value: "101.00",
      sort_order: 0,
    });
    expect(resultPercent.error).toBeDefined();

    const resultAmount = await addContractLineItem({
      contractId: "c1",
      productId: "p1",
      name: "Excessive Amount Discount Item",
      quantity: 1,
      unit_price: "100.00",
      discount_type: "FIXED",
      discount_value: "150.00",
      sort_order: 0,
    });
    expect(resultAmount.error).toBeDefined();
  });
});
