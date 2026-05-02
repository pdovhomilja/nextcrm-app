jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
    crm_Target_Contact: { findFirst: jest.fn() },
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
const ftc = (prismadb as any).crm_Target_Contact.findFirst as jest.MockedFunction<any>;
const send = inngest.send as jest.MockedFunction<typeof inngest.send>;

function makeReq() {
  return new NextRequest(
    "http://localhost/api/crm/targets/t1/contacts/c1/enrich",
    { method: "POST" },
  );
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/crm/targets/[id]/contacts/[contactId]/enrich", () => {
  it("401 when unauthenticated", async () => {
    gs.mockResolvedValue(null as any);
    const res = await POST(makeReq(), {
      params: Promise.resolve({ id: "t1", contactId: "c1" }),
    });
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("404 when target not in scope", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    ft.mockResolvedValue(null);
    const res = await POST(makeReq(), {
      params: Promise.resolve({ id: "t1", contactId: "c1" }),
    });
    expect(res.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("404 when target-contact linkage check fails", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    ft.mockResolvedValue({ id: "t1" } as any);
    ftc.mockResolvedValue(null);
    const res = await POST(makeReq(), {
      params: Promise.resolve({ id: "t1", contactId: "c1" }),
    });
    expect(res.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("200 when owner with valid linkage queues Inngest", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    ft.mockResolvedValue({ id: "t1" } as any);
    ftc.mockResolvedValue({ id: "c1" } as any);
    const res = await POST(makeReq(), {
      params: Promise.resolve({ id: "t1", contactId: "c1" }),
    });
    expect(res.status).toBe(200);
    expect(ftc).toHaveBeenCalledWith({
      where: { id: "c1", targetId: "t1" },
      select: { id: true },
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "enrich/target.contact.run",
        data: expect.objectContaining({ contactId: "c1", triggeredBy: "u" }),
      }),
    );
  });
});
