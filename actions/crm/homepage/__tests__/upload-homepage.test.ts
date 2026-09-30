jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/homepage/storage", () => ({ putHomepageUpload: jest.fn() }));
jest.mock("@/lib/homepage/slug", () => {
  const actual = jest.requireActual("@/lib/homepage/slug-shape");
  return { slugify: actual.slugify, ensureUniqueSlug: jest.fn() };
});
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_Target_Homepage: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthorizationError,
  AuthenticationError,
} from "@/lib/authz";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { putHomepageUpload } from "@/lib/homepage/storage";
import { ensureUniqueSlug } from "@/lib/homepage/slug";
import { prismadb } from "@/lib/prisma";
import { uploadHomepage } from "@/actions/crm/homepage/upload-homepage";
import { MAX_UPLOAD_BYTES } from "@/lib/homepage/upload-limits";

const authed = requireAuthenticated as jest.Mock;
const assertT = assertCanWriteTarget as jest.Mock;
const send = inngest.send as jest.Mock;
const audit = writeAuditLog as jest.Mock;
const put = putHomepageUpload as jest.Mock;
const uniq = ensureUniqueSlug as jest.Mock;
const targetFindFirst = prismadb.crm_Targets.findFirst as jest.Mock;
const hpFindUnique = prismadb.crm_Target_Homepage.findUnique as jest.Mock;
const hpCreate = prismadb.crm_Target_Homepage.create as jest.Mock;
const hpUpdate = prismadb.crm_Target_Homepage.update as jest.Mock;

const TID = "11111111-2222-3333-4444-555555555555";
const ME = { id: "me", role: "user" };
const APPROVED = { id: TID, company: "Acme Plumbing", triage_status: "APPROVED" };
// Deliberately contains a <script> + inline handler: must be stored untouched.
const HTML =
  '<!DOCTYPE html>\n<html><head><style>b{color:red}</style></head><body onload="x()"><script>alert(1)</script>Hi</body></html>\n';

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(ME);
  assertT.mockResolvedValue(undefined);
  send.mockResolvedValue(undefined);
  put.mockResolvedValue(undefined);
  targetFindFirst.mockResolvedValue(APPROVED);
  hpFindUnique.mockResolvedValue(null);
  hpCreate.mockResolvedValue({ id: "h1" });
  hpUpdate.mockResolvedValue({});
  uniq.mockImplementation(async (b: string) => b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
});

describe("uploadHomepage", () => {
  it("rejects empty / non-string html before anything else", async () => {
    expect(await uploadHomepage({ targetId: TID, html: "" })).toEqual({ error: "No HTML provided" });
    expect(await uploadHomepage({ targetId: TID, html: undefined as never })).toEqual({ error: "No HTML provided" });
    expect(authed).not.toHaveBeenCalled();
  });

  it("returns Unauthorized when unauthenticated (no storage, no send)", async () => {
    authed.mockRejectedValue(new AuthenticationError());
    expect(await uploadHomepage({ targetId: TID, html: HTML })).toEqual({ error: "Unauthorized" });
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("returns Forbidden for a user who cannot write the target", async () => {
    assertT.mockRejectedValue(new AuthorizationError());
    expect(await uploadHomepage({ targetId: TID, html: HTML })).toEqual({ error: "Forbidden" });
    expect(targetFindFirst).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("errors when the target is missing", async () => {
    targetFindFirst.mockResolvedValue(null);
    expect(await uploadHomepage({ targetId: TID, html: HTML })).toEqual({ error: "Target not found" });
    expect(put).not.toHaveBeenCalled();
  });

  it("requires an APPROVED target", async () => {
    targetFindFirst.mockResolvedValue({ ...APPROVED, triage_status: "PENDING" });
    expect(await uploadHomepage({ targetId: TID, html: HTML })).toEqual({
      error: "Target must be approved before uploading a homepage",
    });
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects html over the size cap (no write, no send)", async () => {
    const big = "<html>" + "a".repeat(MAX_UPLOAD_BYTES) + "</html>";
    expect(await uploadHomepage({ targetId: TID, html: big })).toEqual({ error: "File too large (max 4 MB)" });
    expect(hpCreate).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("measures size in bytes, not characters", async () => {
    // 3-byte chars: under the cap by length, over it by bytes.
    const multi = "<html>" + "€".repeat(Math.ceil(MAX_UPLOAD_BYTES / 3)) + "</html>";
    expect(multi.length).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(await uploadHomepage({ targetId: TID, html: multi })).toEqual({ error: "File too large (max 4 MB)" });
  });

  it("rejects text that does not look like HTML", async () => {
    expect(await uploadHomepage({ targetId: TID, html: "just some notes, not a page" })).toEqual({
      error: "That doesn't look like an HTML document",
    });
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("accepts a bare <body> fragment and a doctype-only header case-insensitively", async () => {
    expect(await uploadHomepage({ targetId: TID, html: "<BODY>hi</BODY>" })).toEqual({
      data: { queued: true, slug: "acme-plumbing" },
    });
    expect(await uploadHomepage({ targetId: TID, html: "  <!DocType HTML>hi" })).toEqual({
      data: { queued: true, slug: "acme-plumbing" },
    });
  });

  it("returns BUSY when a recent run is in flight (no write, no send)", async () => {
    hpFindUnique.mockResolvedValue({ id: "h1", slug: "acme-plumbing", status: "RUNNING", updatedAt: new Date() });
    expect(await uploadHomepage({ targetId: TID, html: HTML })).toEqual({
      error: "A generation is already in progress. Wait for it to finish.",
    });
    expect(hpUpdate).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("happy path with an existing row: resets status, stores html byte-identical, queues, audits", async () => {
    hpFindUnique.mockResolvedValue({
      id: "h1",
      slug: "acme-plumbing",
      status: "READY",
      updatedAt: new Date(),
    });
    const res = await uploadHomepage({ targetId: TID, html: HTML });
    expect(res).toEqual({ data: { queued: true, slug: "acme-plumbing" } });
    expect(hpCreate).not.toHaveBeenCalled();
    expect(hpUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "h1" }, data: expect.objectContaining({ status: "PENDING", error: null }) }),
    );
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0]).toBe("acme-plumbing");
    // NO sanitization: exactly the bytes the user uploaded.
    expect(put.mock.calls[0][1]).toBe(HTML);
    expect(send).toHaveBeenCalledWith({
      name: "homepage/target.upload",
      data: { homepageId: "h1", targetId: TID, slug: "acme-plumbing", triggeredBy: "me" },
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "target", entityId: TID, action: "updated", userId: "me" }),
    );
  });

  it("happy path with no row: creates the row first, then stores + queues", async () => {
    const res = await uploadHomepage({ targetId: TID, html: HTML });
    expect(res).toEqual({ data: { queued: true, slug: "acme-plumbing" } });
    expect(hpCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetId: TID,
        slug: "acme-plumbing",
        status: "PENDING",
        created_by: "me",
      }),
    });
    expect(put).toHaveBeenCalledWith("acme-plumbing", HTML);
    expect(send).toHaveBeenCalledWith({
      name: "homepage/target.upload",
      data: { homepageId: "h1", targetId: TID, slug: "acme-plumbing", triggeredBy: "me" },
    });
  });

  it("falls back to a target-id slug when the company slugifies to empty", async () => {
    targetFindFirst.mockResolvedValue({ ...APPROVED, company: "!!!" });
    const res = await uploadHomepage({ targetId: TID, html: HTML });
    expect(res).toEqual({ data: { queued: true, slug: "site-11111111" } });
  });

  it("maps a P2002 on create to a retryable conflict error", async () => {
    hpCreate.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    expect(await uploadHomepage({ targetId: TID, html: HTML })).toEqual({
      error: "Slug or homepage already exists; retry",
    });
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("marks the row FAILED and returns an error when the queue send fails", async () => {
    send.mockRejectedValue(new Error("inngest down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await uploadHomepage({ targetId: TID, html: HTML })).toEqual({ error: "Failed to queue upload" });
    expect(hpUpdate).toHaveBeenLastCalledWith({
      where: { id: "h1" },
      data: { status: "FAILED", error: "Failed to queue upload" },
    });
    expect(audit).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
