jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { POST } from "../route";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const ft = prismadb.crm_Targets.findFirst as jest.MockedFunction<typeof prismadb.crm_Targets.findFirst>;
const send = inngest.send as jest.MockedFunction<typeof inngest.send>;

function makeReq(body: unknown = {}) {
  return new NextRequest("http://localhost/api/crm/targets/t1/enrich", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/crm/targets/[id]/enrich", () => {
  it("401 unauth", async () => {
    gs.mockResolvedValue(null as any);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("404 when user does not own target", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    ft.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("user owning target queues Inngest", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    ft.mockResolvedValue({ id: "t1" } as any);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "enrich/target.run",
        data: expect.objectContaining({ targetId: "t1", triggeredBy: "u" }),
      }),
    );
  });
});
