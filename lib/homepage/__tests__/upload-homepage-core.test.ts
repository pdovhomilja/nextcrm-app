jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/homepage/storage", () => ({ putHomepageUpload: jest.fn() }));
jest.mock("@/lib/homepage/slug", () => {
  const actual = jest.requireActual("@/lib/homepage/slug-shape");
  return { slugify: actual.slugify, ensureUniqueSlug: jest.fn() };
});
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Target_Homepage: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { putHomepageUpload } from "@/lib/homepage/storage";
import { ensureUniqueSlug } from "@/lib/homepage/slug";
import { prismadb } from "@/lib/prisma";
import { runUploadHomepage } from "@/lib/homepage/upload-homepage-core";
import { MAX_UPLOAD_BYTES } from "@/lib/homepage/upload-limits";

const send = inngest.send as jest.Mock;
const audit = writeAuditLog as jest.Mock;
const put = putHomepageUpload as jest.Mock;
const uniq = ensureUniqueSlug as jest.Mock;
const hpFindUnique = prismadb.crm_Target_Homepage.findUnique as jest.Mock;
const hpCreate = prismadb.crm_Target_Homepage.create as jest.Mock;
const hpUpdate = prismadb.crm_Target_Homepage.update as jest.Mock;

const TID = "11111111-2222-3333-4444-555555555555";
// Deliberately contains a <script> + inline handler: must be stored untouched.
const HTML =
  '<!DOCTYPE html>\n<html><head><style>b{color:red}</style></head><body onload="x()"><script>alert(1)</script>Hi</body></html>\n';
const run = (html: string, company: string | null = "Acme Plumbing") =>
  runUploadHomepage({ targetId: TID, company, html, userId: "me" });

beforeEach(() => {
  jest.clearAllMocks();
  send.mockResolvedValue(undefined);
  put.mockResolvedValue(undefined);
  hpFindUnique.mockResolvedValue(null);
  hpCreate.mockResolvedValue({ id: "h1" });
  hpUpdate.mockResolvedValue({});
  uniq.mockImplementation(async (b: string) => b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
});

describe("runUploadHomepage", () => {
  it("EMPTY for empty / non-string html", async () => {
    expect(await run("")).toMatchObject({ ok: false, code: "EMPTY", message: "No HTML provided" });
    expect(await run(undefined as never)).toMatchObject({ ok: false, code: "EMPTY" });
    expect(hpCreate).not.toHaveBeenCalled();
  });

  it("TOO_LARGE over the cap (no write, no send)", async () => {
    const big = "<html>" + "a".repeat(MAX_UPLOAD_BYTES) + "</html>";
    expect(await run(big)).toMatchObject({ ok: false, code: "TOO_LARGE", message: "File too large (max 4 MB)" });
    expect(hpCreate).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("measures size in bytes, not characters", async () => {
    const multi = "<html>" + "€".repeat(Math.ceil(MAX_UPLOAD_BYTES / 3)) + "</html>";
    expect(multi.length).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(await run(multi)).toMatchObject({ ok: false, code: "TOO_LARGE" });
  });

  it("NOT_HTML for plain text", async () => {
    expect(await run("just some notes, not a page")).toMatchObject({
      ok: false,
      code: "NOT_HTML",
      message: "That doesn't look like an HTML document",
    });
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("accepts a bare <body> and a doctype-only header case-insensitively", async () => {
    expect(await run("<BODY>hi</BODY>")).toEqual({ ok: true, slug: "acme-plumbing" });
    expect(await run("  <!DocType HTML>hi")).toEqual({ ok: true, slug: "acme-plumbing" });
  });

  it("BUSY when a recent run is in flight (no write, no send)", async () => {
    hpFindUnique.mockResolvedValue({ id: "h1", slug: "acme-plumbing", status: "RUNNING", updatedAt: new Date() });
    expect(await run(HTML)).toMatchObject({ ok: false, code: "BUSY" });
    expect(hpUpdate).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("existing row: resets status, stores html byte-identical (no sanitization), queues, audits", async () => {
    hpFindUnique.mockResolvedValue({ id: "h1", slug: "acme-plumbing", status: "READY", updatedAt: new Date() });
    expect(await run(HTML)).toEqual({ ok: true, slug: "acme-plumbing" });
    expect(hpCreate).not.toHaveBeenCalled();
    expect(hpUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "h1" }, data: expect.objectContaining({ status: "PENDING", error: null }) }),
    );
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0]).toBe("acme-plumbing");
    expect(put.mock.calls[0][1]).toBe(HTML);
    expect(send).toHaveBeenCalledWith({
      name: "homepage/target.upload",
      data: { homepageId: "h1", targetId: TID, slug: "acme-plumbing", triggeredBy: "me" },
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "target", entityId: TID, action: "updated", userId: "me" }),
    );
  });

  it("no row: creates it first, then stores + queues", async () => {
    expect(await run(HTML)).toEqual({ ok: true, slug: "acme-plumbing" });
    expect(hpCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ targetId: TID, slug: "acme-plumbing", status: "PENDING", created_by: "me" }),
    });
    expect(put).toHaveBeenCalledWith("acme-plumbing", HTML);
  });

  it("falls back to a target-id slug when the company slugifies to empty", async () => {
    expect(await run(HTML, "!!!")).toEqual({ ok: true, slug: "site-11111111" });
    expect(await run(HTML, null)).toEqual({ ok: true, slug: "site-11111111" });
  });

  it("CONFLICT on P2002 at create (nothing stored or sent)", async () => {
    hpCreate.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    expect(await run(HTML)).toMatchObject({
      ok: false,
      code: "CONFLICT",
      message: "Slug or homepage already exists; retry",
    });
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("STORE_FAILED: marks the row FAILED, does not queue or audit", async () => {
    put.mockRejectedValue(new Error("r2 down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await run(HTML)).toEqual({ ok: false, code: "STORE_FAILED", message: "Failed to store the upload" });
    expect(hpUpdate).toHaveBeenLastCalledWith({
      where: { id: "h1" },
      data: { status: "FAILED", error: "Failed to store upload" },
    });
    expect(send).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("QUEUE_FAILED: marks the row FAILED when the send fails", async () => {
    send.mockRejectedValue(new Error("inngest down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await run(HTML)).toEqual({ ok: false, code: "QUEUE_FAILED", message: "Failed to queue upload" });
    expect(hpUpdate).toHaveBeenLastCalledWith({
      where: { id: "h1" },
      data: { status: "FAILED", error: "Failed to queue upload" },
    });
    expect(audit).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
