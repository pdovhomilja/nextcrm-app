jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: { updateMany: jest.fn() },
  },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { PATCH } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUnique = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedUpdateMany = prismadb.crm_Contacts.updateMany as jest.MockedFunction<
  typeof prismadb.crm_Contacts.updateMany
>;

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/contacts/c1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/crm/contacts/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(401);
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when user is not allowed to write the contact (count 0)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "victim" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "victim", role: "user" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 0 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(404);
  });

  it("succeeds when scoped update affects a row (user owns contact)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "user" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true, id: "c1" });
  });

  it("manager can write any contact", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "m1", role: "manager" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
  });
});
