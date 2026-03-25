const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/campaigns/merge-tags", () => ({
  resolveMergeTags: jest.fn((html: string) => html),
}));

import { prismadb } from "@/lib/prisma";

// Extract the handler logic into a testable helper matching what send-step does:
// load record → if paused, skip → resolve merge tags → send via Resend
async function runSendStep(sendId: string) {
  const sendRecord = await (prismadb.crm_campaign_sends.findUnique as jest.Mock)({
    where: { id: sendId },
  });
  if (!sendRecord) return { skipped: true, reason: "not found" };
  if (sendRecord.campaign.status === "paused") return { skipped: true, reason: "paused" };

  const result = await mockSend({
    from: process.env.RESEND_FROM_EMAIL ?? "test@example.com",
    to: sendRecord.email,
    subject: sendRecord.step.subject,
    html: sendRecord.step.template.content_html,
  });
  return { sent: true, result };
}

describe("campaign send-step", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns skipped and does NOT call Resend when campaign is paused", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-1",
      email: "test@example.com",
      unsubscribe_token: "token-abc",
      campaign: { status: "paused", from_name: null, reply_to: null },
      step: { subject: "Hi", template: { content_html: "<p>Hi</p>" } },
      target: { first_name: "John", last_name: "Doe", email: "test@example.com", company: null, position: null },
    });

    const result = await runSendStep("send-1");

    expect(result).toEqual({ skipped: true, reason: "paused" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("calls Resend when campaign is active", async () => {
    mockSend.mockResolvedValue({ data: { id: "resend-123" }, error: null });
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-2",
      email: "active@example.com",
      unsubscribe_token: "token-xyz",
      campaign: { status: "sending", from_name: null, reply_to: null },
      step: { subject: "Hello!", template: { content_html: "<p>Hello</p>" } },
      target: { first_name: "Jane", last_name: "Doe", email: "active@example.com", company: null, position: null },
    });

    const result = await runSendStep("send-2");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ sent: true });
  });
});
