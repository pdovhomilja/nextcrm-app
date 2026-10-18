jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { findFirst: jest.fn(), findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/minio", () => ({ minioPresignClient: {}, MINIO_BUCKET: "nextcrm" }));
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(async (_client: unknown, cmd: { input: { Key: string } }) =>
    `https://files.example/nextcrm/${cmd.input.Key}?X-Amz-Signature=sig`,
  ),
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GET } from "../route";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const scopeCheck = prismadb.documents.findFirst as jest.MockedFunction<
  typeof prismadb.documents.findFirst
>;
const fd = prismadb.documents.findUnique as jest.MockedFunction<
  typeof prismadb.documents.findUnique
>;

/** Object key the route asked S3 to sign (the external storage boundary). */
function signedKey() {
  const calls = (getSignedUrl as jest.Mock).mock.calls;
  return calls.length ? calls[0][1].input.Key : undefined;
}

function call() {
  return GET(new NextRequest("http://localhost/api/documents/d1/file"), {
    params: Promise.resolve({ documentId: "d1" }),
  });
}

function signedIn(role = "user") {
  gs.mockResolvedValue({ user: { id: "u" } } as any);
  fu.mockResolvedValue({ id: "u", role } as any);
}

beforeEach(() => jest.clearAllMocks());

describe("GET /api/documents/[documentId]/file", () => {
  it("401 when not signed in", async () => {
    gs.mockResolvedValue(null as any);
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("404 when the user may not read the document", async () => {
    signedIn("user");
    scopeCheck.mockResolvedValue(null);
    fd.mockResolvedValue({ key: "documents/a.pdf", document_file_url: "" } as any);
    const res = await call();
    expect(res.status).toBe(404);
    expect(res.headers.get("location")).toBeNull();
  });

  it("readable document: redirects to a short-lived presigned URL for its key", async () => {
    signedIn("user");
    scopeCheck.mockResolvedValue({ id: "d1" } as any);
    fd.mockResolvedValue({
      key: "documents/a.pdf",
      document_file_url: "https://files.example/nextcrm/documents/a.pdf",
    } as any);
    const res = await call();
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toBe(
      "https://files.example/nextcrm/documents/a.pdf?X-Amz-Signature=sig",
    );
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("legacy row without key: key comes from the stored public URL", async () => {
    signedIn("user");
    scopeCheck.mockResolvedValue({ id: "d1" } as any);
    fd.mockResolvedValue({
      key: null,
      document_file_url: "http://localhost:9000/nextcrm/images/b%20c.png",
    } as any);
    const res = await call();
    expect([302, 307]).toContain(res.status);
    expect(signedKey()).toBe("images/b c.png");
  });

  it("file outside our bucket (old UploadThing rows): redirects to the stored URL", async () => {
    signedIn("user");
    scopeCheck.mockResolvedValue({ id: "d1" } as any);
    fd.mockResolvedValue({
      key: "abc123-offer.pdf",
      document_file_url: "https://utfs.io/f/abc123-offer.pdf",
    } as any);
    const res = await call();
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toBe("https://utfs.io/f/abc123-offer.pdf");
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  // key and url come from the client at upload time; a document must not
  // become a way to read invoices or other objects in the same bucket.
  it.each([
    ["invoices/i1.pdf", ""],
    ["documents/../invoices/i1.pdf", ""],
    [null, "https://files.example/nextcrm/invoices/i1.pdf"],
  ])("404 for a key outside the upload folders (key=%s url=%s)", async (key, url) => {
    signedIn("admin");
    scopeCheck.mockResolvedValue({ id: "d1" } as any);
    fd.mockResolvedValue({ key, document_file_url: url } as any);
    const res = await call();
    expect(res.status).toBe(404);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });
});
