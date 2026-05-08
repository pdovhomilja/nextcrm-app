jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoice_Series: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { GET, POST } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUser = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedFindMany = prismadb.invoice_Series.findMany as jest.MockedFunction<
  typeof prismadb.invoice_Series.findMany
>;
const mockedCreate = prismadb.invoice_Series.create as jest.MockedFunction<
  typeof prismadb.invoice_Series.create
>;

beforeEach(() => jest.clearAllMocks());

function makePost(body: unknown) {
  return new NextRequest("http://localhost/api/admin/invoices/series", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/admin/invoices/series", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "u1", role: "user" } as any);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 for manager", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "m1", role: "manager" } as any);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 for admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "a1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "a1", role: "admin" } as any);
    mockedFindMany.mockResolvedValue([] as any);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalled();
  });
});

describe("POST /api/admin/invoices/series", () => {
  const body = { name: "S", prefixTemplate: "INV-" };

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await POST(makePost(body));
    expect(res.status).toBe(401);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "u1", role: "user" } as any);
    const res = await POST(makePost(body));
    expect(res.status).toBe(403);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("creates for admin", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "a1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "a1", role: "admin" } as any);
    mockedCreate.mockResolvedValue({ id: "s1" } as any);
    const res = await POST(makePost(body));
    expect(res.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalled();
  });
});
