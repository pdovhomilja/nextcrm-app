jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    crm_Contact_Enrichment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/api-keys", () => ({
  getApiKey: jest.fn().mockResolvedValue("sk-test"),
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { POST, DELETE } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUser = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedFindContactScope = prismadb.crm_Contacts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findFirst
>;
const mockedFindContact = prismadb.crm_Contacts.findUnique as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findUnique
>;
const mockedFindEnrichment = prismadb.crm_Contact_Enrichment.findUnique as jest.MockedFunction<
  typeof prismadb.crm_Contact_Enrichment.findUnique
>;
const mockedCreateEnrichment = prismadb.crm_Contact_Enrichment.create as jest.MockedFunction<
  typeof prismadb.crm_Contact_Enrichment.create
>;

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/contacts/enrich", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/crm/contacts/enrich", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await POST(
      makePostReq({ contactId: "c1", fields: [{ name: "website" }] }),
    );
    expect(res.status).toBe(401);
    expect(mockedFindContact).not.toHaveBeenCalled();
    expect(mockedCreateEnrichment).not.toHaveBeenCalled();
  });

  it("returns 403/404 when user does not own the contact (no DB write)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "victim" } } as any);
    mockedFindUser.mockResolvedValue({ id: "victim", role: "user" } as any);
    mockedFindContactScope.mockResolvedValue(null); // assertCanWriteContact throws
    const res = await POST(
      makePostReq({ contactId: "c1", fields: [{ name: "website" }] }),
    );
    expect([403, 404]).toContain(res.status);
    expect(mockedFindContact).not.toHaveBeenCalled();
    expect(mockedCreateEnrichment).not.toHaveBeenCalled();
  });

  it("manager can enrich any contact", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "m1", role: "manager" } as any);
    mockedFindContactScope.mockResolvedValue({ id: "c1" } as any);
    mockedFindContact.mockResolvedValue({ id: "c1", email: "x@y.com" } as any);
    mockedCreateEnrichment.mockResolvedValue({ id: "e1" } as any);

    const res = await POST(
      makePostReq({ contactId: "c1", fields: [{ name: "website" }] }),
    );
    expect(res.status).toBe(200);
    expect(mockedCreateEnrichment).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/crm/contacts/enrich", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const req = new NextRequest(
      "http://localhost/api/crm/contacts/enrich?sessionId=missing",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when sessionId not in activeSessions", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u" } } as any);
    mockedFindUser.mockResolvedValue({ id: "u", role: "user" } as any);
    const req = new NextRequest(
      "http://localhost/api/crm/contacts/enrich?sessionId=ghost",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});
