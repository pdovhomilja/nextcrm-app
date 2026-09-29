const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
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
  renderCampaignEmail: jest.fn().mockResolvedValue("<html>rendered</html>"),
}));
jest.mock("@/lib/email/redirect", () => ({
  redirectRecipients: (to: string) => `redir+${to}`,
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { crmTargetEmailTools } from "@/lib/mcp/tools/crm-target-email";

const send = crmTargetEmailTools.find((t) => t.name === "crm_send_target_email")!;

const ARGS = {
  target_id: "11111111-1111-4111-8111-111111111111",
  template_id: "22222222-2222-4222-8222-222222222222",
  subject: "Hi {{first_name}}",
  body_html: "<p>Hello</p>",
};

const validTarget = {
  id: ARGS.target_id,
  created_by: "u1",
  triage_status: "APPROVED",
  do_not_email: false,
  first_name: "Ada",
  email: "ada@example.com",
  company_email: null,
  personal_email: null,
};

const targets = prismadb.crm_Targets.findFirst as jest.Mock;
const templates = prismadb.crm_campaign_templates.findFirst as jest.Mock;
const emailCreate = prismadb.crm_Target_Email.create as jest.Mock;
const emailUpdate = prismadb.crm_Target_Email.update as jest.Mock;

function expectNothingSentOrDrafted() {
  expect(mockSend).not.toHaveBeenCalled();
  expect(emailCreate).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.clearAllMocks();
  targets.mockResolvedValue({ ...validTarget });
  templates.mockResolvedValue({ id: ARGS.template_id, content_html: "<div>{{body}}</div>" });
  emailCreate.mockResolvedValue({ id: "e1", unsubscribe_token: "tok" });
  emailUpdate.mockImplementation(async ({ data }) => ({ id: "e1", ...data }));
  mockSend.mockResolvedValue({ data: { id: "resend-1" }, error: null });
});

describe("crm_send_target_email", () => {
  it("(a) target not found under created_by userId -> NOT_FOUND, nothing drafted or sent", async () => {
    targets.mockResolvedValue(null);
    await expect(send.handler(ARGS, "u1")).rejects.toThrow("NOT_FOUND");
    expect(targets).toHaveBeenCalledWith({
      where: { id: ARGS.target_id, created_by: "u1", deletedAt: null },
    });
    expectNothingSentOrDrafted();
  });

  it.each(["NEW", "PASSED"])("(b) refuses a %s target", async (status) => {
    targets.mockResolvedValue({ ...validTarget, triage_status: status });
    await expect(send.handler(ARGS, "u1")).rejects.toThrow(/approved/i);
    expectNothingSentOrDrafted();
  });

  it("(c) refuses a do-not-email target", async () => {
    targets.mockResolvedValue({ ...validTarget, do_not_email: true });
    await expect(send.handler(ARGS, "u1")).rejects.toThrow(/do-not-email/i);
    expectNothingSentOrDrafted();
  });

  it("(d) refuses a target with no recipient address", async () => {
    targets.mockResolvedValue({ ...validTarget, email: null });
    await expect(send.handler(ARGS, "u1")).rejects.toThrow(/no email address/i);
    expectNothingSentOrDrafted();
  });

  it("(e) happy path: DRAFT then send to redirected recipient then SENT", async () => {
    const res = await send.handler(ARGS, "u1");
    expect(emailCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetId: ARGS.target_id,
        status: "DRAFT",
        created_by: "u1",
        subject: "Hi Ada",
      }),
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "redir+ada@example.com", subject: "Hi Ada" })
    );
    expect(emailUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: expect.objectContaining({ status: "SENT", resend_message_id: "resend-1" }),
    });
    expect(emailCreate.mock.invocationCallOrder[0]).toBeLessThan(mockSend.mock.invocationCallOrder[0]);
    expect(res).toEqual({ data: expect.objectContaining({ status: "SENT" }) });
  });

  it("(f1) returned send error -> row FAILED and handler rejects", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "bounced" } });
    await expect(send.handler(ARGS, "u1")).rejects.toThrow(/EXTERNAL_ERROR/);
    expect(emailUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { status: "FAILED", error_message: "bounced" },
    });
    expect(emailUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SENT" }) })
    );
  });

  it("(f2) thrown send error -> row FAILED and handler rejects", async () => {
    mockSend.mockRejectedValue(new Error("network down"));
    await expect(send.handler(ARGS, "u1")).rejects.toThrow(/EXTERNAL_ERROR/);
    expect(emailUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { status: "FAILED", error_message: "network down" },
    });
  });

  it("(g1) SENT write failing after the email went out still resolves", async () => {
    emailUpdate.mockRejectedValue(new Error("db down"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(send.handler(ARGS, "u1")).resolves.toEqual({
      data: { id: "e1", status: "SENT" },
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("(g2) audit-log failing after the email went out still resolves", async () => {
    (writeAuditLog as jest.Mock).mockRejectedValue(new Error("audit down"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(send.handler(ARGS, "u1")).resolves.toEqual({
      data: { id: "e1", status: "SENT" },
    });
    spy.mockRestore();
  });
});
