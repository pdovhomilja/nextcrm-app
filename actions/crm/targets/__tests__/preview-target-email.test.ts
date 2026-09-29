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
    id: "t1", triage_status: "APPROVED", first_name: "Ada", company: "Acme",
  });
  (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({
    id: "tpl1", content_html: `<div>{{body}}</div>`,
  });
  (prismadb.crm_Target_Homepage.findFirst as jest.Mock).mockResolvedValue(null);
});

it("renders a preview with the AI body merged in", async () => {
  const res = await previewTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "Hi {{company}}", bodyHtml: "<p>Pitch</p>", includeHomepage: false,
  });
  expect(res).toEqual({ data: { html: `<html><div><p>Pitch</p></div></html>`, subject: "Hi Acme" } });
});

it("refuses a non-approved target", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: "t1", triage_status: "PASSED" });
  const res = await previewTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "x", bodyHtml: "y", includeHomepage: false,
  });
  expect(res).toEqual({ error: "Target must be approved before generating outreach" });
});
