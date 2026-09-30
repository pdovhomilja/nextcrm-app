jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_Target_Homepage: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    crm_Target_Homepage_Version: { findMany: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/homepage/slug", () => ({
  slugify: jest.requireActual("@/lib/homepage/slug").slugify,
  ensureUniqueSlug: jest.fn(async (s: string) =>
    jest.requireActual("@/lib/homepage/slug").slugify(s)
  ),
}));
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { crmHomepageTools } from "@/lib/mcp/tools/crm-homepage";

const gen = crmHomepageTools.find((t) => t.name === "crm_generate_homepage")!;
const status = crmHomepageTools.find((t) => t.name === "crm_get_homepage_status")!;
const TID = "11111111-1111-4111-8111-111111111111";

const targets = prismadb.crm_Targets.findFirst as jest.Mock;
const hp = prismadb.crm_Target_Homepage as unknown as Record<string, jest.Mock>;
const send = inngest.send as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  send.mockResolvedValue(undefined);
});

describe("crm_generate_homepage", () => {
  it("scopes the target lookup by created_by and 404s a foreign target (no row, no event)", async () => {
    targets.mockResolvedValue(null);
    await expect(gen.handler({ target_id: TID } as never, "u1")).rejects.toThrow("NOT_FOUND");
    expect(targets).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TID, created_by: "u1", deletedAt: null } })
    );
    expect(hp.create).not.toHaveBeenCalled();
    expect(hp.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a non-APPROVED target with a validation error (no row, no event)", async () => {
    targets.mockResolvedValue({ id: TID, company: "Acme", company_website: null, triage_status: "NEW" });
    await expect(gen.handler({ target_id: TID } as never, "u1")).rejects.toThrow(/VALIDATION_ERROR/);
    expect(hp.create).not.toHaveBeenCalled();
    expect(hp.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("creates the PENDING row THEN sends the event with the targetId", async () => {
    targets.mockResolvedValue({
      id: TID,
      company: "Acme Co",
      company_website: "https://acme.test",
      triage_status: "APPROVED",
    });
    hp.findUnique.mockResolvedValue(null);
    hp.create.mockResolvedValue({ id: "h1", slug: "acme-co", status: "PENDING" });
    const res = await gen.handler({ target_id: TID, prompt: "  bold  " } as never, "u1");
    expect(hp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetId: TID,
        slug: "acme-co",
        status: "PENDING",
        base_prompt: "bold",
        source_url: "https://acme.test",
        created_by: "u1",
      }),
    });
    expect(send).toHaveBeenCalledWith({
      name: "homepage/target.generate",
      data: { targetId: TID, prompt: "bold", triggeredBy: "u1" },
    });
    expect(hp.create.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0]);
    expect(res).toEqual({ data: { queued: true, slug: "acme-co", status: "PENDING" } });
  });

  it("falls back to site-<first8> when the company slugifies to empty", async () => {
    targets.mockResolvedValue({ id: TID, company: "!!!", company_website: null, triage_status: "APPROVED" });
    hp.findUnique.mockResolvedValue(null);
    hp.create.mockResolvedValue({ id: "h1", slug: "site-11111111" });
    await gen.handler({ target_id: TID } as never, "u1");
    expect(hp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "site-11111111" }),
    });
  });

  it("regenerate resets the existing row to PENDING and keeps the live slug", async () => {
    targets.mockResolvedValue({ id: TID, company: "Acme", company_website: null, triage_status: "APPROVED" });
    hp.findUnique.mockResolvedValue({
      id: "h1",
      slug: "live-slug",
      preview_url: "https://x/live-slug",
      current_version_id: "v1",
    });
    hp.update.mockResolvedValue({ id: "h1", slug: "live-slug" });
    await gen.handler({ target_id: TID } as never, "u1");
    expect(hp.create).not.toHaveBeenCalled();
    const arg = hp.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "h1" });
    expect(arg.data).toEqual(expect.objectContaining({ status: "PENDING", error: null, deletedAt: null }));
    expect(arg.data.slug).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("refuses to rename the slug of an already-published page", async () => {
    targets.mockResolvedValue({ id: TID, company: "Acme", company_website: null, triage_status: "APPROVED" });
    hp.findUnique.mockResolvedValue({
      id: "h1",
      slug: "live-slug",
      preview_url: "https://x/live-slug",
      current_version_id: "v1",
    });
    await expect(
      gen.handler({ target_id: TID, slug: "other" } as never, "u1")
    ).rejects.toThrow(/VALIDATION_ERROR/);
    expect(hp.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("marks the row FAILED and throws when the event cannot be queued", async () => {
    targets.mockResolvedValue({ id: TID, company: "Acme", company_website: null, triage_status: "APPROVED" });
    hp.findUnique.mockResolvedValue(null);
    hp.create.mockResolvedValue({ id: "h1", slug: "acme" });
    send.mockRejectedValue(new Error("down"));
    await expect(gen.handler({ target_id: TID } as never, "u1")).rejects.toThrow(/EXTERNAL_ERROR/);
    expect(hp.update).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: { status: "FAILED", error: "Failed to queue generation job" },
    });
  });
});

describe("crm_get_homepage_status", () => {
  it("scopes by the target's created_by and 404s when the target is not the caller's", async () => {
    hp.findFirst.mockResolvedValue(null);
    await expect(status.handler({ target_id: TID } as never, "u1")).rejects.toThrow("NOT_FOUND");
    expect(hp.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { targetId: TID, deletedAt: null, target: { created_by: "u1", deletedAt: null } },
      })
    );
  });

  it("returns status/slug/urls/current version + version summaries", async () => {
    hp.findFirst.mockResolvedValue({
      id: "h1",
      slug: "acme",
      status: "READY",
      error: null,
      preview_url: "https://x/p/acme",
      screenshot_url: "https://x/s/acme",
      current_version_id: "v2",
      updatedAt: new Date("2026-01-01"),
      versions: [
        { id: "v2", pass_kind: "HUMAN", created_at: new Date("2026-01-02"), agent_critique: "ok" },
        { id: "v1", pass_kind: "AUTO", created_at: new Date("2026-01-01"), agent_critique: null },
      ],
    });
    const res = (await status.handler({ target_id: TID } as never, "u1")) as {
      data: Record<string, unknown>;
    };
    expect(res.data).toEqual(
      expect.objectContaining({
        status: "READY",
        slug: "acme",
        preview_url: "https://x/p/acme",
        screenshot_url: "https://x/s/acme",
        current_version_id: "v2",
        versions: [
          expect.objectContaining({ id: "v2", pass_kind: "HUMAN" }),
          expect.objectContaining({ id: "v1", pass_kind: "AUTO" }),
        ],
      })
    );
    // no html leaked
    expect(JSON.stringify(res.data)).not.toContain("html");
  });
});
