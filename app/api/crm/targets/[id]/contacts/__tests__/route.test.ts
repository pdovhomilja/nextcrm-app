jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
    crm_Target_Contact: { create: jest.fn() },
  },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { POST } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUniqueUser = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedFindFirstTarget = prismadb.crm_Targets.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Targets.findFirst
>;
const mockedCreateTC = prismadb.crm_Target_Contact.create as jest.MockedFunction<
  typeof prismadb.crm_Target_Contact.create
>;

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/targets/t1/contacts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/crm/targets/[id]/contacts", () => {
  it("401 when unauthenticated and does not call create", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await POST(makeReq({ name: "x" }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(401);
    expect(mockedCreateTC).not.toHaveBeenCalled();
  });

  it("404 when user not in target scope and does not call create", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUniqueUser.mockResolvedValue({ id: "u1", role: "user" } as any);
    mockedFindFirstTarget.mockResolvedValue(null as any);

    const res = await POST(makeReq({ name: "x" }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(404);
    expect(mockedCreateTC).not.toHaveBeenCalled();
  });

  it("200 when user owns the target", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUniqueUser.mockResolvedValue({ id: "u1", role: "user" } as any);
    mockedFindFirstTarget.mockResolvedValue({ id: "t1" } as any);
    mockedCreateTC.mockResolvedValue({ id: "tc1" } as any);

    const res = await POST(makeReq({ name: "Alice" }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
    expect(mockedCreateTC).toHaveBeenCalledTimes(1);
  });

  it("200 when manager on any target", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m1" } } as any);
    mockedFindUniqueUser.mockResolvedValue({ id: "m1", role: "manager" } as any);
    mockedFindFirstTarget.mockResolvedValue({ id: "t1" } as any);
    mockedCreateTC.mockResolvedValue({ id: "tc1" } as any);

    const res = await POST(makeReq({ email: "a@b.c" }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
    expect(mockedCreateTC).toHaveBeenCalledTimes(1);
  });
});
