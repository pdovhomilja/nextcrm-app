// Regression tests for GHSA-q96c-2vj9-8v7f: invoice list and detail must
// follow canReadInvoice (creator, or manager/admin).
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoices: { findMany: jest.fn(), findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import {
  getInvoices,
  getInvoiceById,
} from "@/app/[locale]/(routes)/invoices/data/get-invoices";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

beforeEach(() => jest.clearAllMocks());

describe("getInvoices scope", () => {
  it("unauthenticated throws and queries nothing", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(getInvoices()).rejects.toThrow();
    expect(prismadb.invoices.findMany).not.toHaveBeenCalled();
  });

  it("user role: only invoices they created", async () => {
    mockUser("user", "u1");
    (prismadb.invoices.findMany as jest.Mock).mockResolvedValue([]);
    await getInvoices();
    const call = (prismadb.invoices.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ createdBy: "u1" });
  });

  it("manager: unscoped", async () => {
    mockUser("manager", "m1");
    (prismadb.invoices.findMany as jest.Mock).mockResolvedValue([]);
    await getInvoices();
    const call = (prismadb.invoices.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({});
  });
});

describe("getInvoiceById scope", () => {
  it("user role: lookup is restricted to the caller's invoices", async () => {
    mockUser("user", "u1");
    (prismadb.invoices.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getInvoiceById("inv-1");
    expect(res).toBeNull();
    const call = (prismadb.invoices.findFirst as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ id: "inv-1", createdBy: "u1" });
  });

  it("admin: lookup by id only", async () => {
    mockUser("admin", "a1");
    (prismadb.invoices.findFirst as jest.Mock).mockResolvedValue(null);
    await getInvoiceById("inv-1");
    const call = (prismadb.invoices.findFirst as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ id: "inv-1" });
  });
});
