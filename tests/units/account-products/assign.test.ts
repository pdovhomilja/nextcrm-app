import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanWriteAccount: vi.fn(),
  AuthenticationError: class extends Error {
    readonly code = "UNAUTHENTICATED";
    constructor(message = "Unauthenticated") {
      super(message);
      this.name = "AuthenticationError";
    }
  },
  AuthorizationError: class extends Error {
    readonly code = "FORBIDDEN";
    constructor(message = "Forbidden") {
      super(message);
      this.name = "AuthorizationError";
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Products: {
      findUnique: vi.fn(),
    },
    crm_AccountProducts: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/currency", () => ({
  getDefaultCurrency: vi.fn().mockResolvedValue("USD"),
  getSnapshotRate: vi.fn().mockResolvedValue("1.0"),
}));

vi.mock("@/lib/create-safe-action", () => ({
  createSafeAction: vi.fn((_schema, handler) => {
    return (data: any) => handler(data);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { assignProduct } from "@/actions/crm/account-products/assign-product";
import { AuthenticationError, AuthorizationError, assertCanWriteAccount, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

const baseAssignData = {
  accountId: "a1",
  productId: "p1",
  quantity: 1,
  currency: "USD",
  status: "ACTIVE" as const,
  start_date: new Date("2024-01-01"),
};

describe("assignProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanWriteAccount as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("AuthenticationError returns Unauthorized", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await assignProduct(baseAssignData);
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("AuthorizationError returns Forbidden", async () => {
    mockUser("user");
    (assertCanWriteAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await assignProduct(baseAssignData);
    expect(res).toEqual({ error: "Forbidden" });
  });

  it("returns error when product not found", async () => {
    mockUser("user");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await assignProduct(baseAssignData);
    expect(res).toEqual({ error: "Product not found" });
  });

  it("returns error when product is deleted", async () => {
    mockUser("user");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      deletedAt: new Date(),
    });
    const res = await assignProduct(baseAssignData);
    expect(res).toEqual({ error: "Product not found" });
  });

  it("returns error when product is not active", async () => {
    mockUser("user");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      status: "INACTIVE",
      deletedAt: null,
    });
    const res = await assignProduct(baseAssignData);
    expect(res).toEqual({ error: "Only active products can be assigned to accounts" });
  });

  it("returns error when assignment already exists", async () => {
    mockUser("user");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      status: "ACTIVE",
      deletedAt: null,
    });
    (prismadb.crm_AccountProducts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ap1" });
    const res = await assignProduct(baseAssignData);
    expect(res).toEqual({
      error: "This product is already assigned to this account with an active or pending status",
    });
  });

  it("returns error when end date is before start date", async () => {
    mockUser("user");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      status: "ACTIVE",
      deletedAt: null,
    });
    (prismadb.crm_AccountProducts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await assignProduct({
      ...baseAssignData,
      start_date: new Date("2024-02-01"),
      end_date: new Date("2024-01-01"),
    });
    expect(res).toEqual({ error: "End date must be after start date" });
  });

  it("returns error when renewal date is before start date", async () => {
    mockUser("user");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      status: "ACTIVE",
      deletedAt: null,
    });
    (prismadb.crm_AccountProducts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await assignProduct({
      ...baseAssignData,
      start_date: new Date("2024-02-01"),
      renewal_date: new Date("2024-01-01"),
    });
    expect(res).toEqual({ error: "Renewal date must be after start date" });
  });

  it("creates assignment successfully", async () => {
    mockUser("user");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      status: "ACTIVE",
      deletedAt: null,
    });
    (prismadb.crm_AccountProducts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.crm_AccountProducts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ap1" });

    const res = await assignProduct({
      ...baseAssignData,
      quantity: 5,
      custom_price: "99.99",
      currency: "EUR",
      end_date: new Date("2024-12-31"),
      renewal_date: new Date("2024-11-01"),
      notes: "Test assignment",
    });

    expect(res).toEqual({ data: { id: "ap1" } });
  });

  it("rejects assignment with decimal quantity", async () => {
    const res = await assignProduct({
      ...baseAssignData,
      quantity: 1.5,
    });
    expect(res.error).toBeDefined();
  });

  it("rejects assignment with non-numeric custom_price", async () => {
    const res = await assignProduct({
      ...baseAssignData,
      custom_price: "not-a-number",
    });
    expect(res.error).toBeDefined();
  });

  it("rejects assignment with quantity equal to 0 or negative", async () => {
    const resZero = await assignProduct({
      ...baseAssignData,
      quantity: 0,
    });
    expect(resZero.error).toBeDefined();

    const resNegative = await assignProduct({
      ...baseAssignData,
      quantity: -2,
    });
    expect(resNegative.error).toBeDefined();
  });

  it("rejects assignment when renewal_date is after end_date", async () => {
    const res = await assignProduct({
      ...baseAssignData,
      start_date: new Date("2024-01-01"),
      end_date: new Date("2024-02-01"),
      renewal_date: new Date("2024-03-01"),
    });
    expect(res.error).toBeDefined();
  });
});
