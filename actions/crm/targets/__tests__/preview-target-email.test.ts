jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_campaign_templates: { findFirst: jest.fn() },
    crm_Target_Homepage: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/campaigns/render-email", () => ({
  renderCampaignEmail: jest.fn(async ({ contentHtml }) => `<html>${contentHtml}</html>`),
}));

import { requireAuthenticated, assertCanWriteTarget } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { previewTargetEmail } from "@/actions/crm/targets/preview-target-email";

const authed = requireAuthenticated as jest.Mock;
const assertT = assertCanWriteTarget as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue({ id: "me", role: "user" });
  assertT.mockResolvedValue(undefined);
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111", triage_status: "APPROVED", first_name: "Ada", company: "Acme",
  });
  (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({
    id: "22222222-2222-4222-8222-222222222222", content_html: `<div>{{body}}</div>`,
  });
  (prismadb.crm_Target_Homepage.findFirst as jest.Mock).mockResolvedValue(null);
});

it("renders a preview with the AI body merged in", async () => {
  const res = await previewTargetEmail({
    targetId: "11111111-1111-4111-8111-111111111111", templateId: "22222222-2222-4222-8222-222222222222", subject: "Hi {{company}}", bodyHtml: "<p>Pitch</p>", includeHomepage: false,
  });
  expect(res).toEqual({ data: { html: `<html><div><p>Pitch</p></div></html>`, subject: "Hi Acme" } });
});

it("refuses a non-approved target", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", triage_status: "PASSED" });
  const res = await previewTargetEmail({
    targetId: "11111111-1111-4111-8111-111111111111", templateId: "22222222-2222-4222-8222-222222222222", subject: "x", bodyHtml: "y", includeHomepage: false,
  });
  expect(res).toEqual({ error: "Target must be approved before generating outreach" });
});

// ── Deep-review fix group 1: template scope, input validation, authz ──
describe("preview hardening", () => {
  const TARGET_ID = "11111111-1111-4111-8111-111111111111";
  const TEMPLATE_ID = "22222222-2222-4222-8222-222222222222";
  const base = {
    targetId: TARGET_ID, templateId: TEMPLATE_ID, subject: "Hi", bodyHtml: "<p>x</p>", includeHomepage: false,
  };
  const templates = () => prismadb.crm_campaign_templates.findFirst as jest.Mock;

  it("scopes the template lookup to the caller's read scope (non-owner template -> not found)", async () => {
    templates().mockImplementation(async ({ where }: { where: { created_by?: string } }) =>
      where.created_by === "owner" ? { id: TEMPLATE_ID, content_html: "<div>{{body}}</div>" } : null
    );
    expect(await previewTargetEmail(base)).toEqual({ error: "Template not found" });
    expect(templates()).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: TEMPLATE_ID, deletedAt: null, created_by: "me" }),
    });
  });

  it.each([
    ["blank subject", { subject: "  " }],
    ["blank body", { bodyHtml: "" }],
    ["non-UUID target", { targetId: "nope" }],
    ["non-UUID template", { templateId: "nope" }],
  ])("rejects %s before any DB work", async (_l, patch) => {
    const res = await previewTargetEmail({ ...base, ...patch });
    expect(res).toHaveProperty("error");
    expect(authed).not.toHaveBeenCalled();
    expect(prismadb.crm_Targets.findFirst).not.toHaveBeenCalled();
  });

  it("returns Unauthorized when unauthenticated", async () => {
    const { AuthenticationError } = jest.requireMock("@/lib/authz");
    authed.mockRejectedValue(new AuthenticationError());
    expect(await previewTargetEmail(base)).toEqual({ error: "Unauthorized" });
  });

  it("returns Forbidden when the caller cannot write the target", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    assertT.mockRejectedValue(new AuthorizationError());
    expect(await previewTargetEmail(base)).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_Targets.findFirst).not.toHaveBeenCalled();
  });
});
