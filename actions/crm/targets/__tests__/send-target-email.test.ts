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
    id: "t1", triage_status: "APPROVED", first_name: "Ada", company: "Acme",
    email: "ada@acme.com", do_not_email: false,
  });
  (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({
    id: "tpl1", content_html: "<div>{{body}}</div>",
  });
  (prismadb.crm_Target_Homepage.findFirst as jest.Mock).mockResolvedValue(null);
  (prismadb.crm_Target_Email.create as jest.Mock).mockResolvedValue({ id: "e1", unsubscribe_token: "tok" });
  (prismadb.crm_Target_Email.update as jest.Mock).mockResolvedValue({ id: "e1" });
  sendMock.mockResolvedValue({ data: { id: "msg_1" }, error: null });
});

it("sends, records SENT, and logs an email activity", async () => {
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "Hi {{company}}", bodyHtml: "<p>Pitch</p>",
    includeHomepage: false, promptUsed: "warm",
  });
  expect(res).toEqual({ data: { id: "e1" } });
  expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "redir+ada@acme.com", subject: "Hi Acme", html: "<html>final</html>" }));
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "e1" }, data: expect.objectContaining({ status: "SENT", resend_message_id: "msg_1" }) })
  );
  expect(createActivity).toHaveBeenCalledWith(
    expect.objectContaining({ type: "email", status: "completed", links: [{ entityType: "target", entityId: "t1" }] })
  );
});

it("refuses when the target is do_not_email", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
    id: "t1", triage_status: "APPROVED", email: "ada@acme.com", do_not_email: true,
  });
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "x", bodyHtml: "y", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "This target is marked do-not-email." });
  expect(sendMock).not.toHaveBeenCalled();
  expect(prismadb.crm_Target_Email.create).not.toHaveBeenCalled();
});

it("refuses a non-approved target", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: "t1", triage_status: "NEW", email: "a@b.com" });
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "x", bodyHtml: "y", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "Target must be approved before generating outreach" });
  expect(sendMock).not.toHaveBeenCalled();
  expect(prismadb.crm_Target_Email.create).not.toHaveBeenCalled();
});

it("records FAILED when Resend errors", async () => {
  sendMock.mockResolvedValue({ data: null, error: { message: "bounce" } });
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "Hi", bodyHtml: "<p>x</p>", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "Failed to send email." });
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", error_message: "bounce" }) })
  );
});

it("records FAILED when Resend throws", async () => {
  sendMock.mockRejectedValue(new Error("network down"));
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "Hi", bodyHtml: "<p>x</p>", includeHomepage: false, promptUsed: "",
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
    targetId: "t1", templateId: "tpl1", subject: "Hi", bodyHtml: "<p>x</p>", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ data: { id: "e1" } });
  expect(sendMock).toHaveBeenCalledTimes(1);
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "e1" }, data: expect.objectContaining({ status: "SENT" }) })
  );
  expect(errSpy).toHaveBeenCalledWith("[SEND_TARGET_EMAIL_POST_SEND]", expect.any(Error));
  errSpy.mockRestore();
});
