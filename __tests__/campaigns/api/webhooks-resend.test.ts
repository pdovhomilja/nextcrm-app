jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { prismadb } from "@/lib/prisma";
import { POST } from "@/app/api/campaigns/webhooks/resend/route";

const SECRET = "test-webhook-secret";

// Build a request signed the way the route verifies it
// (Resend-Signature: sha256=<hex HMAC-SHA256(body, RESEND_WEBHOOK_SECRET)>).
function signedRequest(payload: unknown): NextRequest {
  const body = JSON.stringify(payload);
  const signature =
    "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
  return new NextRequest("http://localhost/api/campaigns/webhooks/resend", {
    method: "POST",
    headers: { "Resend-Signature": signature },
    body,
  });
}

describe("Resend webhook handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
  });

  it("matches the event by email_id, not the RFC Message-ID header", async () => {
    // A real Resend event carries BOTH ids; `message_id` is the RFC 5322 header
    // (`<...@...>`) and must NOT be used for the lookup — only `email_id` matches
    // the stored `resend_message_id`.
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
      id: "send-1",
      clicked_at: null,
    });

    const res = await POST(
      signedRequest({
        type: "email.clicked",
        data: {
          message_id: "<010001abc-def@mail.example>",
          email_id: "re_abc123",
          created_at: "2026-01-01T00:00:00Z",
        },
      })
    );

    expect(res.status).toBe(200);
    expect(prismadb.crm_campaign_sends.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resend_message_id: "re_abc123" }),
      })
    );
    expect(prismadb.crm_campaign_sends.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "send-1" },
        data: { clicked_at: expect.any(Date) },
      })
    );
  });

  it("does not overwrite opened_at if already set", async () => {
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
      id: "send-1",
      opened_at: new Date("2026-03-10"),
    });
    // simulate: update is not called when opened_at is already set
    expect(prismadb.crm_campaign_sends.update).not.toHaveBeenCalled();
  });

  it("sets opened_at when null", async () => {
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
      id: "send-1",
      opened_at: null,
    });
    await (prismadb.crm_campaign_sends.update as jest.Mock)({
      where: { id: "send-1" },
      data: { opened_at: new Date() },
    });
    expect(prismadb.crm_campaign_sends.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "send-1" } })
    );
  });
});
