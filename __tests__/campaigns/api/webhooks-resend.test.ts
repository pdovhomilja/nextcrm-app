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

const SECRET = "whsec_dGVzdC1zdml4LXNpZ25pbmctc2VjcmV0"; // base64 payload after prefix

// Mirror of the route's Svix scheme, used to forge valid/invalid requests.
function svixSign(id: string, ts: number, body: string, secret = SECRET): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
}

function webhookRequest(
  body: string,
  opts: { id?: string; ts?: number; signature?: string; omitHeaders?: boolean } = {}
): NextRequest {
  const id = opts.id ?? "msg_123";
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const headers: Record<string, string> = {};
  if (!opts.omitHeaders) {
    headers["svix-id"] = id;
    headers["svix-timestamp"] = String(ts);
    headers["svix-signature"] = opts.signature ?? `v1,${svixSign(id, ts, body)}`;
  }
  return new NextRequest("http://localhost/api/campaigns/webhooks/resend", {
    method: "POST",
    headers,
    body,
  });
}

const clickedEvent = JSON.stringify({
  type: "email.clicked",
  data: { email_id: "re_abc123", created_at: "2026-09-28T00:00:00Z" },
});

describe("Resend webhook — Svix signature verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
  });

  it("records a click on a valid signature", async () => {
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
      id: "send-1",
      clicked_at: null,
    });

    const res = await POST(webhookRequest(clickedEvent));

    expect(res.status).toBe(200);
    expect(prismadb.crm_campaign_sends.update).toHaveBeenCalledWith({
      where: { id: "send-1" },
      data: { clicked_at: expect.any(Date) },
    });
  });

  it("sets opened_at only when currently null", async () => {
    const openedEvent = JSON.stringify({
      type: "email.opened",
      data: { email_id: "re_abc123" },
    });

    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValueOnce({
      id: "send-1",
      opened_at: null,
    });
    await POST(webhookRequest(openedEvent));
    expect(prismadb.crm_campaign_sends.update).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValueOnce({
      id: "send-1",
      opened_at: new Date("2026-03-10"),
    });
    await POST(webhookRequest(openedEvent));
    expect(prismadb.crm_campaign_sends.update).not.toHaveBeenCalled();
  });

  it("rejects a tampered body (signature mismatch) with 401", async () => {
    const req = webhookRequest(clickedEvent, {
      signature: "v1,dGFtcGVyZWQtc2lnbmF0dXJl",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(prismadb.crm_campaign_sends.findFirst).not.toHaveBeenCalled();
  });

  it("rejects when the Svix headers are missing with 401", async () => {
    const res = await POST(webhookRequest(clickedEvent, { omitHeaders: true }));
    expect(res.status).toBe(401);
    expect(prismadb.crm_campaign_sends.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a replayed (stale timestamp) delivery with 401", async () => {
    const staleTs = Math.floor(Date.now() / 1000) - 3600;
    const res = await POST(webhookRequest(clickedEvent, { ts: staleTs }));
    expect(res.status).toBe(401);
    expect(prismadb.crm_campaign_sends.findFirst).not.toHaveBeenCalled();
  });

  it("returns 200 without updating for an unknown message id", async () => {
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(webhookRequest(clickedEvent));
    expect(res.status).toBe(200);
    expect(prismadb.crm_campaign_sends.update).not.toHaveBeenCalled();
  });
});
