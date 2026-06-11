import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Contracts: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  diffObjects: vi.fn().mockReturnValue({ title: ["Old", "New"] }),
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

import { updateContract } from "@/actions/crm/contracts/update-contract";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockSessionUser = (email = "user@test.com", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { email, id },
  });
};

describe("updateContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionUser();
    (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });
  });

  it("unauthenticated returns error via session", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateContract({
      id: "c1",
      v: 0,
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      status: "NOTSTARTED" as any,
      account: "a1",
      assigned_to: "u1",
    });
    expect(res).toEqual({ error: "User not logged in." });
  });

  it("user not found returns error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "user@test.com", id: "u1" },
    });
    (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateContract({
      id: "c1",
      v: 0,
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      status: "NOTSTARTED" as any,
      account: "a1",
      assigned_to: "u1",
    });
    expect(res).toEqual({ error: "User not found." });
  });

  it("missing id returns error", async () => {
    (prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await updateContract({
      id: "",
      v: 0,
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      status: "NOTSTARTED" as any,
      account: "a1",
      assigned_to: "u1",
    } as any);
    expect(res).toEqual({ error: "No contract ID provided." });
  });

  it("missing title or value returns error", async () => {
    (prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await updateContract({
      id: "c1",
      v: 0,
      title: "",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      status: "NOTSTARTED" as any,
      account: "a1",
      assigned_to: "u1",
    } as any);
    expect(res).toEqual({ error: "Please fill in all the required fields." });
  });

  it("fetches before state via findUnique with deletedAt:null", async () => {
    (prismadb.crm_Contracts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", title: "Old" });
    (prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", title: "New" });
    await updateContract({
      id: "c1",
      v: 0,
      title: "New",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      status: "NOTSTARTED" as any,
      account: "a1",
      assigned_to: "u1",
    });
    expect(prismadb.crm_Contracts.findUnique).toHaveBeenCalledWith({
      where: { id: "c1", deletedAt: null },
    });
  });

  it("updates contract with correct data and increments v", async () => {
    (prismadb.crm_Contracts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    (prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", title: "Contract" });
    const _res = await updateContract({
      id: "c1",
      v: 0,
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      status: "NOTSTARTED" as any,
      account: "a1",
      assigned_to: "u1",
    });
    const call = (prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.v).toBe(1);
    expect(call.data.title).toBe("Contract");
  });

  it("writes audit log with diff on success", async () => {
    (prismadb.crm_Contracts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", title: "Old" });
    (prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", title: "New" });
    await updateContract({
      id: "c1",
      v: 0,
      title: "New",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      status: "NOTSTARTED" as any,
      account: "a1",
      assigned_to: "u1",
    });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "contract",
      entityId: "c1",
      action: "updated",
      changes: { title: ["Old", "New"] },
      userId: "u1",
    });
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Contracts.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await updateContract({
      id: "c1",
      v: 0,
      title: "Contract",
      value: "1000",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Desc",
      status: "NOTSTARTED" as any,
      account: "a1",
      assigned_to: "u1",
    });
    expect(res).toEqual({
      error: "Something went wrong while trying to run UpdateContract action. Please try again.",
    });
  });
});
