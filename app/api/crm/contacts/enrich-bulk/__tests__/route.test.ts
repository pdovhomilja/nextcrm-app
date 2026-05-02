jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/api-keys", () => ({
  getApiKey: jest.fn().mockResolvedValue("sk-test"),
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({ ids: ["1"] }) },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { POST } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedUser = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedFindMany = prismadb.crm_Contacts.findMany as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findMany
>;
const mockedSend = inngest.send as jest.MockedFunction<typeof inngest.send>;

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/contacts/enrich-bulk", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/crm/contacts/enrich-bulk", () => {
  it("401 unauth", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await POST(makeReq({ contactIds: ["a"], fields: [{ name: "website" }] }));
    expect(res.status).toBe(401);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("403 when any contact id is unauthorized (fail-closed)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u" } } as any);
    mockedUser.mockResolvedValue({ id: "u", role: "user" } as any);
    mockedFindMany.mockResolvedValue([{ id: "a" }] as any);
    const res = await POST(
      makeReq({ contactIds: ["a", "b"], fields: [{ name: "website" }] }),
    );
    expect(res.status).toBe(403);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("succeeds + sends Inngest event when all ids authorized", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m" } } as any);
    mockedUser.mockResolvedValue({ id: "m", role: "manager" } as any);
    mockedFindMany.mockResolvedValue([{ id: "a" }, { id: "b" }] as any);
    const res = await POST(
      makeReq({ contactIds: ["a", "b"], fields: [{ name: "website" }] }),
    );
    expect(res.status).toBe(200);
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "enrich/contacts.bulk",
        data: expect.objectContaining({
          contactIds: ["a", "b"],
          triggeredBy: "m",
        }),
      }),
    );
  });
});
