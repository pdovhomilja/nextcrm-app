jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Targets: { updateMany: jest.fn() },
  },
}));
jest.mock("@/lib/enrichment/presets/target-fields", () => ({
  FIELD_MAP: { website: "website" },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { PATCH } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUnique = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedUpdateMany = prismadb.crm_Targets.updateMany as jest.MockedFunction<
  typeof prismadb.crm_Targets.updateMany
>;

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/targets/t1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/crm/targets/[id]", () => {
  it("401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(401);
  });

  it("404 when user does not own the target", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "user" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 0 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(404);
  });

  it("user owning the target succeeds", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "user" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
  });

  it("manager succeeds on any target", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "m1", role: "manager" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
  });
});
