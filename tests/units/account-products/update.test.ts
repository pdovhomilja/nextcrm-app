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
    crm_AccountProducts: {
      findUnique: vi.fn(),
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

import { updateAssignment } from "@/actions/crm/account-products/update-assignment";
import { AuthenticationError, AuthorizationError, assertCanWriteAccount, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("updateAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanWriteAccount as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("AuthenticationError returns Unauthorized", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await updateAssignment({ id: "ap1", quantity: 5 });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("returns error when assignment not found", async () => {
    mockUser("user");
    (prismadb.crm_AccountProducts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateAssignment({ id: "ap1", quantity: 5 });
    expect(res).toEqual({ error: "Assignment not found" });
  });

  it("AuthorizationError returns Forbidden", async () => {
    mockUser("user");
    (prismadb.crm_AccountProducts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ap1",
      accountId: "a1",
    });
    (assertCanWriteAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await updateAssignment({ id: "ap1", quantity: 5 });
    expect(res).toEqual({ error: "Forbidden" });
  });

  it("returns error when end date is before start date", async () => {
    mockUser("user");
    (prismadb.crm_AccountProducts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ap1",
      accountId: "a1",
      start_date: new Date("2024-01-01"),
    });
    const res = await updateAssignment({
      id: "ap1",
      end_date: new Date("2023-12-01"),
    });
    expect(res).toEqual({ error: "End date must be after start date" });
  });

  it("returns error when renewal date is before start date", async () => {
    mockUser("user");
    (prismadb.crm_AccountProducts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ap1",
      accountId: "a1",
      start_date: new Date("2024-01-01"),
    });
    const res = await updateAssignment({
      id: "ap1",
      renewal_date: new Date("2023-12-01"),
    });
    expect(res).toEqual({ error: "Renewal date must be after start date" });
  });

  it("updates assignment successfully", async () => {
    mockUser("user");
    const existing = {
      id: "ap1",
      accountId: "a1",
      quantity: 1,
      start_date: new Date("2024-01-01"),
    };
    (prismadb.crm_AccountProducts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (prismadb.crm_AccountProducts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ap1", quantity: 5 });

    const res = await updateAssignment({
      id: "ap1",
      quantity: 5,
      custom_price: "149.99",
      status: "ACTIVE",
    });

    expect(res).toEqual({ data: { id: "ap1" } });
  });
});
