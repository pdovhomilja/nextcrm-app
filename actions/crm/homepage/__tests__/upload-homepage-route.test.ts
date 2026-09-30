jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
  unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
  notFoundOrForbiddenResponse: () => Response.json({ error: "Not found" }, { status: 404 }),
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
    crm_Target_Homepage: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
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
import { POST } from "@/app/api/crm/targets/[id]/upload-homepage/route";
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
const HTML =
  '<!DOCTYPE html>\n<html><head></head><body onload="x()"><script>alert(1)</script>Hi</body></html>\n';

const call = (body: unknown = { html: HTML }) =>
  POST({ json: async () => body } as never, { params: Promise.resolve({ id: TID }) });

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

describe("POST /api/crm/targets/[id]/upload-homepage", () => {
  it("401 when unauthenticated (no storage, no send)", async () => {
    authed.mockRejectedValue(new AuthenticationError());
    expect((await call()).status).toBe(401);
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("404 (not-found-or-forbidden) for a non-owner", async () => {
    assertT.mockRejectedValue(new AuthorizationError());
    expect((await call()).status).toBe(404);
    expect(targetFindFirst).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("404 when the target is missing", async () => {
    targetFindFirst.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
    expect(put).not.toHaveBeenCalled();
  });

  it("409 for a non-APPROVED target", async () => {
    targetFindFirst.mockResolvedValue({ ...APPROVED, triage_status: "PENDING" });
    const res = await call();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/approved/i);
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("400 for empty html, a missing/null body, too-large html and non-HTML text", async () => {
    for (const body of [{ html: "" }, {}, null, { html: 42 }]) {
      expect((await call(body)).status).toBe(400);
    }
    const big = "<html>" + "a".repeat(MAX_UPLOAD_BYTES) + "</html>";
    const tooBig = await call({ html: big });
    expect(tooBig.status).toBe(400);
    expect((await tooBig.json()).error).toBe("File too large (max 4 MB)");
    expect((await call({ html: "plain notes" })).status).toBe(400);
    expect(hpCreate).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("409 when a generation is already running", async () => {
    hpFindUnique.mockResolvedValue({ id: "h1", slug: "acme-plumbing", status: "RUNNING", updatedAt: new Date() });
    expect((await call()).status).toBe(409);
    expect(put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("409 on a slug race (P2002)", async () => {
    hpCreate.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    expect((await call()).status).toBe(409);
  });

  it("200 {queued, slug}: stores html byte-identical, queues, audits", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ queued: true, slug: "acme-plumbing" });
    expect(put).toHaveBeenCalledWith("acme-plumbing", HTML); // no sanitization
    expect(send).toHaveBeenCalledWith({
      name: "homepage/target.upload",
      data: { homepageId: "h1", targetId: TID, slug: "acme-plumbing", triggeredBy: "me" },
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ entityId: TID, userId: "me" }));
  });

  it("502 when storing fails (row marked FAILED, nothing queued)", async () => {
    put.mockRejectedValue(new Error("r2 down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("Failed to store the upload");
    expect(hpUpdate).toHaveBeenLastCalledWith({
      where: { id: "h1" },
      data: { status: "FAILED", error: "Failed to store upload" },
    });
    expect(send).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("502 when queueing fails", async () => {
    send.mockRejectedValue(new Error("inngest down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await call()).status).toBe(502);
    errSpy.mockRestore();
  });
});
