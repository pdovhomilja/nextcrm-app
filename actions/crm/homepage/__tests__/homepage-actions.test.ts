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
jest.mock("@/lib/homepage/slug", () => {
  const actual = jest.requireActual("@/lib/homepage/slug");
  return { ...actual, ensureUniqueSlug: jest.fn(async (b: string) => actual.slugify(b)) };
});
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_Target_Homepage: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    crm_Target_Homepage_Version: { findFirst: jest.fn() },
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
import { ensureUniqueSlug } from "@/lib/homepage/slug";
import { prismadb } from "@/lib/prisma";
import { POST } from "@/app/api/crm/targets/[id]/generate-homepage/route";
import { refineHomepage } from "@/actions/crm/homepage/refine-homepage";
import { getHomepageStatus } from "@/actions/crm/homepage/get-homepage-status";
import { revertHomepageVersion } from "@/actions/crm/homepage/revert-homepage-version";
import { updateHomepageSlug } from "@/actions/crm/homepage/update-homepage-slug";

const authed = requireAuthenticated as jest.Mock;
const assertT = assertCanWriteTarget as jest.Mock;
const send = inngest.send as jest.Mock;
const audit = writeAuditLog as jest.Mock;
const uniq = ensureUniqueSlug as jest.Mock;
const targetFindFirst = prismadb.crm_Targets.findFirst as jest.Mock;
const hpFindFirst = prismadb.crm_Target_Homepage.findFirst as jest.Mock;
const hpFindUnique = prismadb.crm_Target_Homepage.findUnique as jest.Mock;
const hpCreate = prismadb.crm_Target_Homepage.create as jest.Mock;
const hpUpdate = prismadb.crm_Target_Homepage.update as jest.Mock;
const verFindFirst = prismadb.crm_Target_Homepage_Version.findFirst as jest.Mock;

const TID = "11111111-2222-3333-4444-555555555555";
const ME = { id: "me", role: "user" };
const APPROVED = {
  id: TID,
  company: "Acme Plumbing",
  company_website: "https://acme.example",
  triage_status: "APPROVED",
};
const HP = { id: "h1", targetId: TID, slug: "acme-plumbing", current_version_id: "v2" };

const call = (body: unknown = {}) =>
  POST({ json: async () => body } as never, { params: Promise.resolve({ id: TID }) });

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(ME);
  assertT.mockResolvedValue(undefined);
  send.mockResolvedValue(undefined);
  targetFindFirst.mockResolvedValue(APPROVED);
  hpFindUnique.mockResolvedValue(null);
  hpFindFirst.mockResolvedValue(HP);
  hpCreate.mockResolvedValue({ id: "h1" });
  hpUpdate.mockResolvedValue({});
  uniq.mockImplementation(async (b: string) => b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
});

describe("POST generate-homepage", () => {
  it("creates the row THEN sends the event with targetId", async () => {
    const res = await call({ prompt: "Bold" });
    expect(await res.json()).toEqual({ queued: true });
    expect(hpCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetId: TID,
        slug: "acme-plumbing",
        status: "PENDING",
        base_prompt: "Bold",
        source_url: "https://acme.example",
      }),
    });
    expect(send).toHaveBeenCalledWith({
      name: "homepage/target.generate",
      data: { targetId: TID, prompt: "Bold", triggeredBy: "me" },
    });
    expect(hpCreate.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "target", entityId: TID, action: "updated", userId: "me" }),
    );
  });

  it("uses a provided slug (slugified + ensured unique)", async () => {
    await call({ slug: "My Custom Slug" });
    expect(uniq).toHaveBeenCalledWith("My Custom Slug");
    expect(hpCreate.mock.calls[0][0].data.slug).toBe("my-custom-slug");
  });

  it("falls back to a target-id slug when the company yields an empty slug", async () => {
    targetFindFirst.mockResolvedValue({ ...APPROVED, company: "!!!" });
    await call();
    expect(hpCreate.mock.calls[0][0].data.slug).toBe(`site-${TID.slice(0, 8)}`);
  });

  it("keeps the existing row's slug on regenerate and resets it to PENDING", async () => {
    hpFindUnique.mockResolvedValue({ id: "h1", slug: "acme-plumbing" });
    await call();
    expect(hpCreate).not.toHaveBeenCalled();
    expect(hpUpdate).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: expect.objectContaining({ status: "PENDING", error: null }),
    });
    expect(hpUpdate.mock.calls[0][0].data.slug).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("refuses a non-approved target (no row, no event)", async () => {
    targetFindFirst.mockResolvedValue({ ...APPROVED, triage_status: "NEW" });
    const res = await call();
    expect(res.status).toBe(409);
    expect(send).not.toHaveBeenCalled();
    expect(hpCreate).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    authed.mockRejectedValue(new AuthenticationError());
    const res = await call();
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 404/403 for a non-owner", async () => {
    assertT.mockRejectedValue(new AuthorizationError());
    const res = await call();
    expect([403, 404]).toContain(res.status);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 409 (not 500) on a P2002 unique collision", async () => {
    hpCreate.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const res = await call();
    expect(res.status).toBe(409);
    expect(send).not.toHaveBeenCalled();
  });

  it("marks the row FAILED if the event send fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    send.mockRejectedValue(new Error("inngest down"));
    const res = await call();
    expect(res.status).toBe(502);
    expect(hpUpdate).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: expect.objectContaining({ status: "FAILED" }),
    });
  });
});

describe("refineHomepage", () => {
  it("authorizes via the homepage's target and sends the refine event WITH targetId", async () => {
    const res = await refineHomepage({ homepageId: "h1", prompt: "Bigger hero" });
    expect(res).toEqual({ data: { queued: true } });
    expect(assertT).toHaveBeenCalledWith(ME, TID);
    expect(send).toHaveBeenCalledWith({
      name: "homepage/target.refine",
      data: { homepageId: "h1", targetId: TID, prompt: "Bigger hero", triggeredBy: "me" },
    });
  });
  it("writes an audit log on success", async () => {
    await refineHomepage({ homepageId: "h1", prompt: "x" });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "target", entityId: TID, action: "updated", userId: "me" }),
    );
  });
  it("rejects a non-string prompt without throwing", async () => {
    const res = await refineHomepage({ homepageId: "h1", prompt: undefined as unknown as string });
    expect(res).toEqual({ error: "A change request is required." });
    expect(send).not.toHaveBeenCalled();
  });
  it("refuses a non-approved target", async () => {
    targetFindFirst.mockResolvedValue({ ...APPROVED, triage_status: "PASSED" });
    const res = await refineHomepage({ homepageId: "h1", prompt: "x" });
    expect(res).toEqual({ error: "Target must be approved before generating a homepage" });
    expect(send).not.toHaveBeenCalled();
  });
  it("Forbidden for a non-owner", async () => {
    assertT.mockRejectedValue(new AuthorizationError());
    expect(await refineHomepage({ homepageId: "h1", prompt: "x" })).toEqual({ error: "Forbidden" });
    expect(send).not.toHaveBeenCalled();
  });
  it("requires a prompt", async () => {
    expect(await refineHomepage({ homepageId: "h1", prompt: "  " })).toEqual({ error: "A change request is required." });
    expect(send).not.toHaveBeenCalled();
  });
  it("Homepage not found", async () => {
    hpFindFirst.mockResolvedValue(null);
    expect(await refineHomepage({ homepageId: "nope", prompt: "x" })).toEqual({ error: "Homepage not found" });
  });
});

describe("getHomepageStatus", () => {
  it("returns the status shape with versions ordered created_at asc", async () => {
    const created = new Date("2026-01-01");
    hpFindFirst.mockResolvedValue({
      ...HP,
      status: "READY",
      error: null,
      preview_url: "https://p/p/acme",
      screenshot_url: "https://p/p/acme/screenshot.png",
      versions: [{ id: "v1", pass_kind: "AUTO", agent_critique: "c", created_at: created }],
    });
    const res = await getHomepageStatus({ targetId: TID });
    expect(res).toEqual({
      data: {
        id: "h1",
        status: "READY",
        error: null,
        slug: "acme-plumbing",
        preview_url: "https://p/p/acme",
        screenshot_url: "https://p/p/acme/screenshot.png",
        current_version_id: "v2",
        versions: [{ id: "v1", pass_kind: "AUTO", agent_critique: "c", created_at: created }],
      },
    });
    expect(hpFindFirst.mock.calls[0][0].where).toEqual({ targetId: TID, deletedAt: null });
    expect(JSON.stringify(hpFindFirst.mock.calls[0][0].select.versions.orderBy)).toContain("asc");
    expect(assertT).toHaveBeenCalledWith(ME, TID);
  });
  it("returns data:null when no homepage exists", async () => {
    hpFindFirst.mockResolvedValue(null);
    expect(await getHomepageStatus({ targetId: TID })).toEqual({ data: null });
  });
  it("Forbidden for a non-owner", async () => {
    assertT.mockRejectedValue(new AuthorizationError());
    expect(await getHomepageStatus({ targetId: TID })).toEqual({ error: "Forbidden" });
  });
});

describe("revertHomepageVersion", () => {
  it("sends a revert event (no rendering in the action) and audits", async () => {
    verFindFirst.mockResolvedValue({ id: "v1" });
    const res = await revertHomepageVersion({ homepageId: "h1", versionId: "v1" });
    expect(res).toEqual({ data: { queued: true } });
    expect(verFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "v1", homepage_id: "h1" } }),
    );
    expect(send).toHaveBeenCalledWith({
      name: "homepage/target.revert",
      data: { homepageId: "h1", targetId: TID, versionId: "v1", triggeredBy: "me" },
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "target", entityId: TID, action: "updated" }),
    );
  });
  it("refuses when the target is no longer approved", async () => {
    targetFindFirst.mockResolvedValue({ ...APPROVED, triage_status: "PASSED" });
    verFindFirst.mockResolvedValue({ id: "v1" });
    const res = await revertHomepageVersion({ homepageId: "h1", versionId: "v1" });
    expect(res).toEqual({ error: "Target must be approved before generating a homepage" });
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects a version that belongs to another homepage", async () => {
    verFindFirst.mockResolvedValue(null);
    expect(await revertHomepageVersion({ homepageId: "h1", versionId: "x" })).toEqual({ error: "Version not found" });
    expect(send).not.toHaveBeenCalled();
  });
  it("Forbidden for a non-owner", async () => {
    assertT.mockRejectedValue(new AuthorizationError());
    expect(await revertHomepageVersion({ homepageId: "h1", versionId: "v1" })).toEqual({ error: "Forbidden" });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("updateHomepageSlug", () => {
  const UNPUBLISHED = { ...HP, status: "FAILED", preview_url: null, current_version_id: null };
  beforeEach(() => hpFindFirst.mockResolvedValue(UNPUBLISHED));

  it("ensures uniqueness and updates when unpublished/failed", async () => {
    uniq.mockResolvedValue("new-slug-2");
    const res = await updateHomepageSlug({ homepageId: "h1", slug: "New Slug" });
    expect(uniq).toHaveBeenCalledWith("New Slug");
    expect(hpUpdate).toHaveBeenCalledWith({ where: { id: "h1" }, data: { slug: "new-slug-2" } });
    expect(res).toEqual({ data: { slug: "new-slug-2" } });
  });
  it("allows a rename of a never-published PENDING-free row (no preview_url, not READY)", async () => {
    // status is not READY/PENDING/RUNNING and nothing published
    hpFindFirst.mockResolvedValue({ ...HP, status: "FAILED", preview_url: null, current_version_id: null });
    expect((await updateHomepageSlug({ homepageId: "h1", slug: "fresh" })).error).toBeUndefined();
  });
  it("rejects a rename of a READY (published) page", async () => {
    hpFindFirst.mockResolvedValue({ ...HP, status: "READY", preview_url: "https://p/p/acme-plumbing" });
    const res = await updateHomepageSlug({ homepageId: "h1", slug: "other" });
    expect(res).toEqual({ error: "This page is already published; regenerate to change its URL." });
    expect(hpUpdate).not.toHaveBeenCalled();
  });
  it("rejects a rename of a READY page even when preview_url is null", async () => {
    hpFindFirst.mockResolvedValue({ ...HP, status: "READY", preview_url: null });
    const res = await updateHomepageSlug({ homepageId: "h1", slug: "other" });
    expect(res.error).toMatch(/already published/);
    expect(hpUpdate).not.toHaveBeenCalled();
  });
  it("rejects a rename of a FAILED page that still has a live preview_url (failed refine of a published page)", async () => {
    hpFindFirst.mockResolvedValue({ ...HP, status: "FAILED", preview_url: "https://p/p/acme-plumbing", current_version_id: null });
    const res = await updateHomepageSlug({ homepageId: "h1", slug: "other" });
    expect(res).toEqual({ error: "This page is already published; regenerate to change its URL." });
    expect(hpUpdate).not.toHaveBeenCalled();
  });
  it("rejects a rename of a FAILED page that has a published version even with null preview_url", async () => {
    hpFindFirst.mockResolvedValue({ ...HP, status: "FAILED", preview_url: null, current_version_id: "v2" });
    const res = await updateHomepageSlug({ homepageId: "h1", slug: "other" });
    expect(res.error).toMatch(/already published/);
    expect(hpUpdate).not.toHaveBeenCalled();
  });
  it.each(["PENDING", "RUNNING"])("rejects a rename while %s", async (status) => {
    hpFindFirst.mockResolvedValue({ ...HP, status, preview_url: null });
    const res = await updateHomepageSlug({ homepageId: "h1", slug: "other" });
    expect(res).toEqual({ error: "Can't rename while generating." });
    expect(hpUpdate).not.toHaveBeenCalled();
  });
  it("returns a friendly error on a P2002 collision", async () => {
    hpUpdate.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const res = await updateHomepageSlug({ homepageId: "h1", slug: "taken" });
    expect(res).toEqual({ error: "That slug is taken, pick another." });
  });
  it("is a no-op when the slug is unchanged (does not suffix its own slug)", async () => {
    const res = await updateHomepageSlug({ homepageId: "h1", slug: "Acme Plumbing" });
    expect(uniq).not.toHaveBeenCalled();
    expect(hpUpdate).not.toHaveBeenCalled();
    expect(res).toEqual({ data: { slug: "acme-plumbing" } });
  });
  it("rejects an empty slug", async () => {
    expect(await updateHomepageSlug({ homepageId: "h1", slug: "!!!" })).toEqual({ error: "slug is required" });
    expect(hpUpdate).not.toHaveBeenCalled();
  });
  it("Forbidden for a non-owner", async () => {
    assertT.mockRejectedValue(new AuthorizationError());
    expect(await updateHomepageSlug({ homepageId: "h1", slug: "x" })).toEqual({ error: "Forbidden" });
    expect(hpUpdate).not.toHaveBeenCalled();
  });
});
