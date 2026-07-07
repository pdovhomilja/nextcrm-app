import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { create: vi.fn() },
  },
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue({}) },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { createAccount } from "@/actions/crm/accounts/create-account";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("createAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createAccount({ name: "Acme" });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Accounts.create).not.toHaveBeenCalled();
  });

  it("missing name returns error", async () => {
    const res = await createAccount({ name: "" });
    expect(res).toEqual({ error: "name is required" });
    expect(prismadb.crm_Accounts.create).not.toHaveBeenCalled();
  });

  it("creates account with correct default fields", async () => {
    const mockAccount = { id: "a1", name: "Acme", v: 0 };
    (prismadb.crm_Accounts.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount);
    const res = await createAccount({ name: "Acme" });
    expect(res).toEqual({ data: mockAccount });
    expect(prismadb.crm_Accounts.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        v: 0,
        createdBy: "u1",
        updatedBy: "u1",
        name: "Acme",
        status: "Active",
      }),
    });
  });

  it("creates account with all fields", async () => {
    (prismadb.crm_Accounts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await createAccount({
      name: "Acme",
      office_phone: "123",
      website: "acme.com",
      fax: "456",
      company_id: "cid1",
      vat: "V123",
      email: "a@acme.com",
      billing_street: "Street 1",
      billing_postal_code: "10000",
      billing_city: "City",
      billing_state: "State",
      billing_country: "Country",
      shipping_street: "Street 2",
      shipping_postal_code: "20000",
      shipping_city: "Ship City",
      shipping_state: "Ship State",
      shipping_country: "Ship Country",
      description: "Desc",
      assigned_to: "u2",
      status: "Inactive",
      annual_revenue: "1000000",
      member_of: "parent1",
      industry: "Tech",
    });
    const call = (prismadb.crm_Accounts.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data).toMatchObject({
      name: "Acme",
      office_phone: "123",
      website: "acme.com",
      fax: "456",
      company_id: "cid1",
      vat: "V123",
      email: "a@acme.com",
      billing_street: "Street 1",
      billing_postal_code: "10000",
      billing_city: "City",
      billing_state: "State",
      billing_country: "Country",
      shipping_street: "Street 2",
      shipping_postal_code: "20000",
      shipping_city: "Ship City",
      shipping_state: "Ship State",
      shipping_country: "Ship Country",
      description: "Desc",
      assigned_to: "u2",
      annual_revenue: "1000000",
      member_of: "parent1",
      industry: "Tech",
      status: "Active",
    });
  });

  it("writes audit log on success", async () => {
    (prismadb.crm_Accounts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await createAccount({ name: "Acme" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "account",
      entityId: "a1",
      action: "created",
      changes: null,
      userId: "u1",
    });
  });

  it("sends inngest event on success", async () => {
    (prismadb.crm_Accounts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await createAccount({ name: "Acme" });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/account.saved",
      data: { record_id: "a1" },
    });
  });

  it("revalidates accounts path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Accounts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await createAccount({ name: "Acme" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/accounts", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Accounts.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await createAccount({ name: "Acme" });
    expect(res).toEqual({ error: "Failed to create account" });
  });

  it("rejects creation with invalid email format", async () => {
    const res = await createAccount({
      name: "Invalid Email Account",
      email: "not-an-email-at-all",
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Accounts.create).not.toHaveBeenCalled();
  });

  it("rejects creation with invalid characters in office_phone", async () => {
    const res = await createAccount({
      name: "Invalid Phone Account",
      office_phone: "INVALID_PHONE_###$$$",
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Accounts.create).not.toHaveBeenCalled();
  });

  it("rejects creation when billing_city exceeds 255 characters", async () => {
    const longCity = "a".repeat(256);
    const res = await createAccount({
      name: "Overflow Account",
      billing_city: longCity,
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Accounts.create).not.toHaveBeenCalled();
  });
});
