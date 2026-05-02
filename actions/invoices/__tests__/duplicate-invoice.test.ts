jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoices: { findUniqueOrThrow: jest.fn(), create: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { duplicateInvoice } from "../duplicate-invoice";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const fi = prismadb.invoices.findUniqueOrThrow as jest.MockedFunction<typeof prismadb.invoices.findUniqueOrThrow>;
const fa = prismadb.crm_Accounts.findFirst as jest.MockedFunction<typeof prismadb.crm_Accounts.findFirst>;
const ci = prismadb.invoices.create as jest.MockedFunction<typeof prismadb.invoices.create>;

beforeEach(() => jest.clearAllMocks());

describe("duplicateInvoice", () => {
  it("throws when unauthenticated", async () => {
    gs.mockResolvedValue(null as any);
    await expect(duplicateInvoice("i1")).rejects.toThrow();
    expect(ci).not.toHaveBeenCalled();
  });

  it("throws when user cannot read source invoice", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ id: "src", createdBy: "other", status: "ISSUED", accountId: "a1", lineItems: [] } as any);
    await expect(duplicateInvoice("i1")).rejects.toThrow(/forbidden/i);
    expect(ci).not.toHaveBeenCalled();
  });

  it("throws when user cannot write the copied accountId", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ id: "src", createdBy: "u", status: "ISSUED", accountId: "a1", lineItems: [] } as any);
    fa.mockResolvedValue(null);
    await expect(duplicateInvoice("i1")).rejects.toThrow(/forbidden/i);
    expect(ci).not.toHaveBeenCalled();
  });

  it("succeeds when both checks pass", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ id: "src", createdBy: "u", status: "ISSUED", accountId: "a1", lineItems: [], type: "INVOICE", currency: "USD", subtotal: "0", discountTotal: "0", vatTotal: "0", grandTotal: "0" } as any);
    fa.mockResolvedValue({ id: "a1" } as any);
    ci.mockResolvedValue({ id: "new" } as any);
    await duplicateInvoice("i1");
    expect(ci).toHaveBeenCalledTimes(1);
  });
});
