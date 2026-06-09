import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
  cache: vi.fn((fn) => fn),
}));

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  AuthenticationError: class extends Error {
    readonly code = "UNAUTHENTICATED";
    constructor(message = "Unauthenticated") {
      super(message);
      this.name = "AuthenticationError";
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Products: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    crm_ProductCategories: {
      findMany: vi.fn(),
    },
  },
}));

import { getProduct } from "@/actions/crm/products/get-product";
import { getProductCategories } from "@/actions/crm/products/get-product-categories";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { AuthenticationError, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

describe("getProductsFull", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns empty array", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getProductsFull();
    expect(res).toEqual([]);
  });

  it("returns products with includes", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });
    const products = [
      {
        id: "p1",
        name: "Product 1",
        category: { id: "c1", name: "Category 1" },
        created_by_user: { id: "u1", name: "User" },
        _count: { accountProducts: 2 },
      },
    ];
    (prismadb.crm_Products.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(products);
    const res = await getProductsFull();
    expect(res).toEqual(products);
  });
});

describe("getProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns null", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getProduct("p1");
    expect(res).toBeNull();
  });

  it("returns product by id with includes", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });
    const product = {
      id: "p1",
      name: "Product 1",
      category: { id: "c1", name: "Category 1" },
      created_by_user: { id: "u1", name: "User" },
      accountProducts: [],
    };
    (prismadb.crm_Products.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(product);
    const res = await getProduct("p1");
    expect(res).toEqual(product);
  });
});

describe("getProductCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active categories ordered by order", async () => {
    const categories = [
      { id: "c1", name: "Category 1", order: 1 },
      { id: "c2", name: "Category 2", order: 2 },
    ];
    (prismadb.crm_ProductCategories.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    const res = await getProductCategories();
    expect(res).toEqual(categories);
    expect(prismadb.crm_ProductCategories.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  });
});
