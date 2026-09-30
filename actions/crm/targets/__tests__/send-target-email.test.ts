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
    crm_Target_Email: { create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/lib/campaigns/render-email", () => ({
  renderCampaignEmail: jest.fn(async () => "<html>final</html>"),
}));
jest.mock("@/lib/email/redirect", () => ({ redirectRecipients: jest.fn((to) => `redir+${to}`) }));
jest.mock("@/actions/crm/activities/create-activity", () => ({ createActivity: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const sendMock = jest.fn().mockResolvedValue({ data: { id: "msg_1" }, error: null });
jest.mock("resend", () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }));

import { requireAuthenticated, assertCanWriteTarget } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { sendTargetEmail } from "@/actions/crm/targets/send-target-email";

const authed = requireAuthenticated as jest.Mock;
const assertT = assertCanWriteTarget as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue({ id: "me", role: "user" });
  assertT.mockResolvedValue(undefined);
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111", triage_status: "APPROVED", first_name: "Ada", company: "Acme",
    email: "ada@acme.com", do_not_email: false,
  });
  (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({
    id: "22222222-2222-4222-8222-222222222222", content_html: "<div>{{body}}</div>",
  });
  (prismadb.crm_Target_Homepage.findFirst as jest.Mock).mockResolvedValue(null);
  (prismadb.crm_Target_Email.create as jest.Mock).mockResolvedValue({ id: "e1", unsubscribe_token: "tok" });
  (prismadb.crm_Target_Email.update as jest.Mock).mockResolvedValue({ id: "e1" });
  sendMock.mockResolvedValue({ data: { id: "msg_1" }, error: null });
});

it("sends, records SENT, and logs an email activity", async () => {
  const res = await sendTargetEmail({
    targetId: "11111111-1111-4111-8111-111111111111", templateId: "22222222-2222-4222-8222-222222222222", subject: "Hi {{company}}", bodyHtml: "<p>Pitch</p>",
    includeHomepage: false, promptUsed: "warm",
  });
  expect(res).toEqual({ data: { id: "e1" } });
  expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "redir+ada@acme.com", subject: "Hi Acme", html: "<html>final</html>" }));
  expect(sendMock.mock.calls[0][0].headers).toEqual(
    expect.objectContaining({
      "List-Unsubscribe": expect.stringMatching(/^<.+>$/),
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    })
  );
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "e1" }, data: expect.objectContaining({ status: "SENT", resend_message_id: "msg_1" }) })
  );
  expect(createActivity).toHaveBeenCalledWith(
    expect.objectContaining({ type: "email", status: "completed", links: [{ entityType: "target", entityId: "11111111-1111-4111-8111-111111111111" }] })
  );
});

it("refuses when the target is do_not_email", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111", triage_status: "APPROVED", email: "ada@acme.com", do_not_email: true,
  });
  const res = await sendTargetEmail({
    targetId: "11111111-1111-4111-8111-111111111111", templateId: "22222222-2222-4222-8222-222222222222", subject: "x", bodyHtml: "y", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "This target is marked do-not-email." });
  expect(sendMock).not.toHaveBeenCalled();
  expect(prismadb.crm_Target_Email.create).not.toHaveBeenCalled();
});

it("refuses a non-approved target", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", triage_status: "NEW", email: "a@b.com" });
  const res = await sendTargetEmail({
    targetId: "11111111-1111-4111-8111-111111111111", templateId: "22222222-2222-4222-8222-222222222222", subject: "x", bodyHtml: "y", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "Target must be approved before generating outreach" });
  expect(sendMock).not.toHaveBeenCalled();
  expect(prismadb.crm_Target_Email.create).not.toHaveBeenCalled();
});

it("records FAILED when Resend errors", async () => {
  sendMock.mockResolvedValue({ data: null, error: { message: "bounce" } });
  const res = await sendTargetEmail({
    targetId: "11111111-1111-4111-8111-111111111111", templateId: "22222222-2222-4222-8222-222222222222", subject: "Hi", bodyHtml: "<p>x</p>", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "Failed to send email." });
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", error_message: "bounce" }) })
  );
});

it("records FAILED when Resend throws", async () => {
  sendMock.mockRejectedValue(new Error("network down"));
  const res = await sendTargetEmail({
    targetId: "11111111-1111-4111-8111-111111111111", templateId: "22222222-2222-4222-8222-222222222222", subject: "Hi", bodyHtml: "<p>x</p>", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "Failed to send email." });
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "e1" }, data: expect.objectContaining({ status: "FAILED", error_message: "network down" }) })
  );
});

it("still succeeds (no duplicate-send retry) when post-send bookkeeping throws", async () => {
  const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  (createActivity as jest.Mock).mockRejectedValue(new Error("activity boom"));
  const res = await sendTargetEmail({
    targetId: "11111111-1111-4111-8111-111111111111", templateId: "22222222-2222-4222-8222-222222222222", subject: "Hi", bodyHtml: "<p>x</p>", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ data: { id: "e1" } });
  expect(sendMock).toHaveBeenCalledTimes(1);
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "e1" }, data: expect.objectContaining({ status: "SENT" }) })
  );
  expect(errSpy).toHaveBeenCalledWith("[SEND_TARGET_EMAIL_POST_SEND]", expect.any(Error));
  errSpy.mockRestore();
});

// ── Deep-review fix group 1: template scope, fail-closed base URL, input validation, authz ──
describe("send hardening", () => {
  const TARGET_ID = "11111111-1111-4111-8111-111111111111";
  const TEMPLATE_ID = "22222222-2222-4222-8222-222222222222";
  const base = {
    targetId: TARGET_ID, templateId: TEMPLATE_ID, subject: "Hi", bodyHtml: "<p>x</p>",
    includeHomepage: false, promptUsed: "",
  };
  const templates = () => prismadb.crm_campaign_templates.findFirst as jest.Mock;

  it("scopes the template lookup to the caller's read scope (non-owner template -> not found, no send)", async () => {
    // Model the scoped where: only rows created by "owner" match.
    templates().mockImplementation(async ({ where }: { where: { created_by?: string } }) =>
      where.created_by === "owner" ? { id: TEMPLATE_ID, content_html: "<div>{{body}}</div>" } : null
    );
    const res = await sendTargetEmail(base);
    expect(res).toEqual({ error: "Template not found" });
    expect(templates()).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: TEMPLATE_ID, deletedAt: null, created_by: "me" }),
    });
    expect(sendMock).not.toHaveBeenCalled();
    expect(prismadb.crm_Target_Email.create).not.toHaveBeenCalled();
  });

  it("does not owner-scope the template lookup for a manager", async () => {
    authed.mockResolvedValue({ id: "boss", role: "manager" });
    await sendTargetEmail(base);
    expect(templates()).toHaveBeenCalledWith({ where: { id: TEMPLATE_ID, deletedAt: null } });
  });

  it.each(["", "   "])("rejects blank subject %j before any DB work", async (subject) => {
    const res = await sendTargetEmail({ ...base, subject });
    expect(res).toHaveProperty("error");
    expect(authed).not.toHaveBeenCalled();
    expect(prismadb.crm_Targets.findFirst).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it.each(["", " \n "])("rejects blank body %j before any DB work", async (bodyHtml) => {
    const res = await sendTargetEmail({ ...base, bodyHtml });
    expect(res).toHaveProperty("error");
    expect(prismadb.crm_Targets.findFirst).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID ids before any DB work", async () => {
    expect(await sendTargetEmail({ ...base, targetId: "nope" })).toHaveProperty("error");
    expect(await sendTargetEmail({ ...base, templateId: "nope" })).toHaveProperty("error");
    expect(prismadb.crm_Targets.findFirst).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  describe("NEXTAUTH_URL unset", () => {
    const saved = process.env.NEXTAUTH_URL;
    afterEach(() => {
      if (saved === undefined) delete process.env.NEXTAUTH_URL;
      else process.env.NEXTAUTH_URL = saved;
    });

    it.each([undefined, ""])("fails closed (%j): error, no DRAFT, no send", async (val) => {
      if (val === undefined) delete process.env.NEXTAUTH_URL;
      else process.env.NEXTAUTH_URL = val;
      const res = await sendTargetEmail(base);
      expect(res).toEqual({ error: "Sending is not configured (missing base URL)." });
      expect(prismadb.crm_Target_Email.create).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
      expect(createActivity).not.toHaveBeenCalled();
    });
  });

  it("returns Unauthorized when unauthenticated", async () => {
    const { AuthenticationError } = jest.requireMock("@/lib/authz");
    authed.mockRejectedValue(new AuthenticationError());
    expect(await sendTargetEmail(base)).toEqual({ error: "Unauthorized" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns Forbidden when the caller cannot write the target", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    assertT.mockRejectedValue(new AuthorizationError());
    expect(await sendTargetEmail(base)).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_Targets.findFirst).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
