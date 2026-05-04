jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoice_TaxRates: {
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { PATCH, DELETE } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUser = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedUpdate = prismadb.invoice_TaxRates.update as jest.MockedFunction<
  typeof prismadb.invoice_TaxRates.update
>;
const mockedDelete = prismadb.invoice_TaxRates.delete as jest.MockedFunction<
  typeof prismadb.invoice_TaxRates.delete
>;

beforeEach(() => jest.clearAllMocks());

function makePatch(body: unknown) {
  return new NextRequest("http://localhost/api/admin/invoices/tax-rates/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
function makeDelete() {
  return new NextRequest("http://localhost/api/admin/invoices/tax-rates/x", {
    method: "DELETE",
  });
}
const params = { params: Promise.resolve({ id: "tr1" }) };

describe("PATCH /api/admin/invoices/tax-rates/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await PATCH(makePatch({ rate: 0.1 }), params);
    expect(res.status).toBe(401);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "u1", role: "user" } as any);
    const res = await PATCH(makePatch({ rate: 0.1 }), params);
    expect(res.status).toBe(403);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("updates for admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "a1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "a1", role: "admin" } as any);
    mockedUpdate.mockResolvedValue({ id: "tr1" } as any);
    const res = await PATCH(makePatch({ rate: 0.1 }), params);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/invoices/tax-rates/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await DELETE(makeDelete(), params);
    expect(res.status).toBe(401);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "u1", role: "user" } as any);
    const res = await DELETE(makeDelete(), params);
    expect(res.status).toBe(403);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("deletes for admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "a1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "a1", role: "admin" } as any);
    mockedDelete.mockResolvedValue({ id: "tr1" } as any);
    const res = await DELETE(makeDelete(), params);
    expect(res.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalled();
  });
});
