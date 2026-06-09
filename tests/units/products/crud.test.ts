import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireRole: vi.fn(),
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
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  diffObjects: vi.fn((before, after) => ({ before, after })),
}));

vi.mock("@/lib/create-safe-action", () => ({
  createSafeAction: vi.fn((_schema, handler) => {
    return (data: any) => handler(data);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createProduct } from "@/actions/crm/products/create-product";
import { deleteProduct } from "@/actions/crm/products/delete-product";
import { updateProduct } from "@/actions/crm/products/update-product";
import { AuthenticationError, AuthorizationError, requireRole } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockActor = (role: "manager" | "admin", id = "u1") => {
  (requireRole as ReturnType<typeof vi.fn>).mockResolvedValue({ id, role });
};

const baseProduct = {
  name: "Product",
  type: "PRODUCT" as const,
  unit_price: "100",
  currency: "USD",
  status: "DRAFT" as const,
  is_recurring: false,
};

describe("createProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns Unauthorized", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await createProduct(baseProduct);
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("AuthorizationError returns Forbidden", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await createProduct(baseProduct);
    expect(res).toEqual({ error: "Forbidden" });
  });

  it("returns error when recurring without billing period", async () => {
    mockActor("manager");
    const res = await createProduct({
      ...baseProduct,
      is_recurring: true,
    });
    expect(res).toEqual({
      error: "Billing period is required for recurring products",
    });
  });

  it("returns error when SKU already exists", async () => {
    mockActor("manager");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", sku: "SKU1" });
    const res = await createProduct({
      ...baseProduct,
      sku: "SKU1",
    });
    expect(res).toEqual({ error: 'A product with SKU "SKU1" already exists' });
  });

  it("creates product successfully", async () => {
    mockActor("admin");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.crm_Products.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", name: "Product" });

    const res = await createProduct({
      ...baseProduct,
      name: "Product",
      type: "SERVICE",
      unit_price: "99.99",
      unit_cost: "50.00",
      currency: "EUR",
      tax_rate: "20",
      unit: "piece",
      is_recurring: true,
      billing_period: "MONTHLY",
      categoryId: "c1",
      sku: "SKU123",
    });

    expect(res).toEqual({ data: { id: "p1", name: "Product" } });
  });
});

describe("deleteProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns Unauthorized", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await deleteProduct("p1");
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("soft deletes product successfully", async () => {
    mockActor("admin");
    (prismadb.crm_Products.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });

    const res = await deleteProduct("p1");
    expect(res).toEqual({ data: { id: "p1" } });
    expect(prismadb.crm_Products.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { deletedAt: expect.any(Date), deletedBy: "u1" },
    });
  });
});

describe("updateProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns Unauthorized", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await updateProduct({
      id: "p1",
      name: "Updated",
    });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("returns error when product not found", async () => {
    mockActor("manager");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateProduct({ id: "p1", name: "Updated" });
    expect(res).toEqual({ error: "Product not found" });
  });

  it("returns error when SKU already exists", async () => {
    mockActor("manager");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "p1",
      sku: "OLD",
      deletedAt: null,
    });
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "p2", sku: "NEW" });
    const res = await updateProduct({ id: "p1", sku: "NEW" });
    expect(res).toEqual({ error: 'A product with SKU "NEW" already exists' });
  });

  it("returns error when recurring without billing period", async () => {
    mockActor("manager");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      is_recurring: true,
      deletedAt: null,
    });
    const res = await updateProduct({
      id: "p1",
      is_recurring: true,
      billing_period: null,
    });
    expect(res).toEqual({
      error: "Billing period is required for recurring products",
    });
  });

  it("updates product successfully", async () => {
    mockActor("admin");
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      name: "Old",
      deletedAt: null,
      is_recurring: false,
      billing_period: null,
    });
    (prismadb.crm_Products.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", name: "Updated" });

    const res = await updateProduct({
      id: "p1",
      name: "Updated",
      unit_price: "150",
    });

    expect(res).toEqual({ data: { id: "p1", name: "Updated" } });
  });
});
