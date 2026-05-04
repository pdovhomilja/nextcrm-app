jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoice_Series: {
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
const mockedUpdate = prismadb.invoice_Series.update as jest.MockedFunction<
  typeof prismadb.invoice_Series.update
>;
const mockedDelete = prismadb.invoice_Series.delete as jest.MockedFunction<
  typeof prismadb.invoice_Series.delete
>;

beforeEach(() => jest.clearAllMocks());

function makePatch(body: unknown) {
  return new NextRequest("http://localhost/api/admin/invoices/series/x", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
function makeDelete() {
  return new NextRequest("http://localhost/api/admin/invoices/series/x", {
    method: "DELETE",
  });
}
const params = { params: Promise.resolve({ id: "s1" }) };

describe("PATCH /api/admin/invoices/series/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await PATCH(makePatch({ name: "n" }), params);
    expect(res.status).toBe(401);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "u1", role: "user" } as any);
    const res = await PATCH(makePatch({ name: "n" }), params);
    expect(res.status).toBe(403);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("updates for admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "a1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "a1", role: "admin" } as any);
    mockedUpdate.mockResolvedValue({ id: "s1" } as any);
    const res = await PATCH(makePatch({ name: "n" }), params);
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/invoices/series/[id]", () => {
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
    mockedDelete.mockResolvedValue({ id: "s1" } as any);
    const res = await DELETE(makeDelete(), params);
    expect(res.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalled();
  });
});
