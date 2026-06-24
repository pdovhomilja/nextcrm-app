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
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    crm_ProductCategories: {
      findMany: vi.fn(),
    },
    currency: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("papaparse", () => ({
  default: {
    parse: vi.fn((text: string, _options: unknown) => {
      const rows = text.trim().split("\n").slice(1);
      const headers = text.trim().split("\n")[0].split(",");
      const data = rows.map((row: string) => {
        const values = row.split(",");
        const obj: Record<string, string> = {};
        headers.forEach((h: string, i: number) => {
          obj[h.trim()] = values[i]?.trim() || "";
        });
        return obj;
      });
      return { data };
    }),
  },
}));

import { importProducts } from "@/actions/crm/products/import-products";
import { AuthenticationError, AuthorizationError, requireRole } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockActor = (role: "manager" | "admin", id = "u1") => {
  (requireRole as ReturnType<typeof vi.fn>).mockResolvedValue({ id, role });
};

describe("importProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prismadb.crm_ProductCategories.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "c1", name: "Electronics" },
    ]);
    (prismadb.currency.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ code: "USD" }, { code: "EUR" }]);
    (prismadb.crm_Products.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("throws error when not authenticated", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    await expect(importProducts(new FormData())).rejects.toThrow("Unauthorized");
  });

  it("throws error when not authorized", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    await expect(importProducts(new FormData())).rejects.toThrow("Forbidden");
  });

  it("throws error when no file provided", async () => {
    mockActor("admin");
    await expect(importProducts(new FormData())).rejects.toThrow("No file provided");
  });

  it("imports valid products successfully", async () => {
    mockActor("admin");
    (prismadb.crm_Products.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const csvContent = "name,type,unit_price,currency\nProduct1,PRODUCT,100,USD";
    const file = new File([csvContent], "products.csv", {
      type: "text/csv",
    });
    const formData = new FormData();
    formData.append("file", file);

    const res = await importProducts(formData);
    expect(res.imported).toBe(1);
    expect(res.errors).toEqual([]);
  });

  it("reports missing required fields", async () => {
    mockActor("admin");

    const csvContent = "name,type,unit_price,currency\nProduct1,PRODUCT,,USD";
    const file = new File([csvContent], "products.csv", {
      type: "text/csv",
    });
    const formData = new FormData();
    formData.append("file", file);

    const res = await importProducts(formData);
    expect(res.imported).toBe(0);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("missing required fields");
  });

  it("reports invalid product type", async () => {
    mockActor("admin");

    const csvContent = "name,type,unit_price,currency\nProduct1,INVALID,100,USD";
    const file = new File([csvContent], "products.csv", {
      type: "text/csv",
    });
    const formData = new FormData();
    formData.append("file", file);

    const res = await importProducts(formData);
    expect(res.imported).toBe(0);
    expect(res.errors[0]).toContain("invalid type");
  });

  it("reports unknown currency", async () => {
    mockActor("admin");

    const csvContent = "name,type,unit_price,currency\nProduct1,PRODUCT,100,GBP";
    const file = new File([csvContent], "products.csv", {
      type: "text/csv",
    });
    const formData = new FormData();
    formData.append("file", file);

    const res = await importProducts(formData);
    expect(res.imported).toBe(0);
    expect(res.errors[0]).toContain("unknown currency");
  });

  it("reports invalid unit price", async () => {
    mockActor("admin");

    const csvContent = "name,type,unit_price,currency\nProduct1,PRODUCT,invalid,USD";
    const file = new File([csvContent], "products.csv", {
      type: "text/csv",
    });
    const formData = new FormData();
    formData.append("file", file);

    const res = await importProducts(formData);
    expect(res.imported).toBe(0);
    expect(res.errors[0]).toContain("invalid unit_price");
  });
});
