import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
  cache: vi.fn((fn) => fn),
}));

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanReadAccount: vi.fn(),
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
    crm_AccountProducts: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    crm_Products: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  diffObjects: vi.fn((before, after) => ({ before, after })),
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

import { getAccountProducts } from "@/actions/crm/account-products/get-account-products";
import { AuthenticationError, AuthorizationError, assertCanReadAccount, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getAccountProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanReadAccount as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("AuthenticationError returns empty array", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getAccountProducts("a1");
    expect(res).toEqual([]);
  });

  it("AuthorizationError returns empty array", async () => {
    mockUser("user");
    (assertCanReadAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getAccountProducts("a1");
    expect(res).toEqual([]);
  });

  it("returns account products with product details", async () => {
    mockUser("user");
    const products = [
      {
        id: "ap1",
        accountId: "a1",
        product: {
          id: "p1",
          name: "Product 1",
          sku: "SKU1",
          type: "PHYSICAL",
          status: "ACTIVE",
          unit_price: 100,
          unit: "piece",
          is_recurring: false,
          billing_period: null,
        },
      },
    ];
    (prismadb.crm_AccountProducts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(products);
    const res = await getAccountProducts("a1");
    expect(res).toEqual(products);
    expect(prismadb.crm_AccountProducts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: "a1" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              type: true,
              status: true,
              unit_price: true,
              unit: true,
              is_recurring: true,
              billing_period: true,
            },
          },
        },
      }),
    );
  });
});
