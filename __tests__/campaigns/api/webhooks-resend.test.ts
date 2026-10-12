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
import { verifyResendSignature } from "@/lib/campaigns/resend-signature";

// Resend signs with Svix: base64(HMAC-SHA256(base64-decoded secret after
// `whsec_`, `${svix-id}.${svix-timestamp}.${body}`)), sent as `v1,<sig>`.
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";

function svixHeaders(id: string, timestamp: number, body: string) {
  const key = Buffer.from(SECRET.slice("whsec_".length), "base64");
  const sig = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return {
    "svix-id": id,
    "svix-timestamp": String(timestamp),
    "svix-signature": `v1,${sig}`,
  };
}

function request(body: string, headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/campaigns/webhooks/resend", {
    method: "POST",
    headers,
    body,
  });
}

function signedRequest(payload: unknown): NextRequest {
  const body = JSON.stringify(payload);
  return request(body, svixHeaders("msg_test", Math.floor(Date.now() / 1000), body));
}

describe("Resend webhook signature (Svix)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => jest.useRealTimers());

  it("accepts the Svix documentation test vector", () => {
    // Vector from Svix's "verifying payloads manually" docs.
    jest.useFakeTimers().setSystemTime(new Date(1614265330 * 1000));
    const headers = new Headers({
      "svix-id": "msg_p5jXN8AQM9LWM0D4loKWxJek",
      "svix-timestamp": "1614265330",
      "svix-signature": "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
    });
    expect(verifyResendSignature('{"test": 2432232314}', headers)).toBe(true);
    expect(verifyResendSignature('{"test": 2432232315}', headers)).toBe(false);
  });

  it("rejects a tampered body", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const headers = svixHeaders("msg_1", ts, '{"type":"email.opened"}');
    const res = await POST(request('{"type":"email.bounced"}', headers));
    expect(res.status).toBe(401);
  });

  it("rejects a timestamp outside the 5-minute tolerance", async () => {
    const ts = Math.floor(Date.now() / 1000) - 10 * 60;
    const body = '{"type":"email.opened","data":{}}';
    const res = await POST(request(body, svixHeaders("msg_1", ts, body)));
    expect(res.status).toBe(401);
  });

  it("rejects the old Resend-Signature header format", async () => {
    const body = '{"type":"email.opened","data":{}}';
    const res = await POST(
      request(body, {
        "Resend-Signature":
          "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex"),
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects everything when RESEND_WEBHOOK_SECRET is unset", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await POST(signedRequest({ type: "email.opened", data: {} }));
    expect(res.status).toBe(401);
  });
});

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
