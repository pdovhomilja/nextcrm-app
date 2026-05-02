jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoices: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/invoices/storage", () => ({
  getInvoicePdfPresignedUrl: jest.fn().mockResolvedValue("https://s3.example/x"),
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { GET } from "../route";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const fi = prismadb.invoices.findUnique as jest.MockedFunction<typeof prismadb.invoices.findUnique>;

function req() {
  return new NextRequest("http://localhost/api/invoices/i1/pdf");
}

beforeEach(() => jest.clearAllMocks());

describe("GET /api/invoices/[invoiceId]/pdf", () => {
  it("401 unauth", async () => {
    gs.mockResolvedValue(null as any);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect(res.status).toBe(401);
  });

  it("404 when user does not own the invoice", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ createdBy: "other", status: "ISSUED", pdfStorageKey: "k" } as any);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect(res.status).toBe(404);
  });

  it("404 when invoice not found", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue(null);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect(res.status).toBe(404);
  });

  it("creator gets redirect to presigned URL", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ createdBy: "u", status: "ISSUED", pdfStorageKey: "k" } as any);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect([302, 307]).toContain(res.status);
  });

  it("manager gets redirect for any invoice", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    fi.mockResolvedValue({ createdBy: "other", status: "ISSUED", pdfStorageKey: "k" } as any);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect([302, 307]).toContain(res.status);
  });
});
