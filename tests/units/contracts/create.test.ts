import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Contracts: { create: vi.fn() },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/currency", () => ({
  getDefaultCurrency: vi.fn().mockResolvedValue("USD"),
  getSnapshotRate: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/create-safe-action", () => ({
  createSafeAction: vi.fn((_schema, handler) => {
    return (data: any) => handler(data);
  }),
}));

import { createNewContract } from "@/actions/crm/contracts/create-new-contract";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockSessionUser = (email = "user@test.com", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { email, id },
  });
};

describe("createNewContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionUser();
    (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });
  });

  it("unauthenticated returns error via session", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createNewContract({
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      account: "a1",
      assigned_to: "u1",
    });
    expect(res).toEqual({ error: "User not logged in." });
  });

  it("user not found in db returns error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "user@test.com", id: "u1" },
    });
    (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createNewContract({
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      account: "a1",
      assigned_to: "u1",
    });
    expect(res).toEqual({ error: "User not found." });
  });

  it("missing title or value returns error", async () => {
    (prismadb.crm_Contracts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    const res = await createNewContract({
      title: "",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      account: "a1",
      assigned_to: "u1",
    } as any);
    expect(res).toEqual({ error: "Please fill in all the required fields." });
  });

  it("creates contract with correct data", async () => {
    (prismadb.crm_Contracts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", title: "Contract" });
    const _res = await createNewContract({
      title: "Contract",
      value: "1000",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
      renewalReminderDate: new Date("2024-11-01"),
      customerSignedDate: new Date("2024-01-15"),
      companySignedDate: new Date("2024-01-16"),
      description: "Desc",
      account: "a1",
      assigned_to: "u1",
    });
    expect(prismadb.crm_Contracts.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        v: 0,
        title: "Contract",
        value: 1000,
        createdBy: "u1",
      }),
    });
  });

  it("writes audit log on success", async () => {
    (prismadb.crm_Contracts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await createNewContract({
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      account: "a1",
      assigned_to: "u1",
    });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "contract",
      entityId: "c1",
      action: "created",
      changes: null,
      userId: "u1",
    });
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Contracts.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await createNewContract({
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      account: "a1",
      assigned_to: "u1",
    });
    expect(res).toEqual({
      error: "Something went wrong while trying to run CreateNewContract action. Please try again.",
    });
  });
});
