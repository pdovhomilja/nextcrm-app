jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoices: { findFirst: jest.fn() },
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
const fi = prismadb.invoices.findFirst as jest.MockedFunction<typeof prismadb.invoices.findFirst>;

// The read scope is in the where: answer like the DB would for this row.
function invoiceRow(row: { createdBy: string; pdfStorageKey: string } | null) {
  fi.mockImplementation((async (args: { where: { createdBy?: string } }) =>
    row && (args.where.createdBy === undefined || args.where.createdBy === row.createdBy)
      ? row
      : null) as any);
}

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
    invoiceRow({ createdBy: "other", pdfStorageKey: "k" });
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect(res.status).toBe(404);
  });

  it("404 when invoice not found", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    invoiceRow(null);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect(res.status).toBe(404);
  });

  it("creator gets redirect to presigned URL", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    invoiceRow({ createdBy: "u", pdfStorageKey: "k" });
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect([302, 307]).toContain(res.status);
  });

  it("manager gets redirect for any invoice", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    invoiceRow({ createdBy: "other", pdfStorageKey: "k" });
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect([302, 307]).toContain(res.status);
  });
});
