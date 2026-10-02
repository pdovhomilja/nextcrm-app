jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    crm_Target_Email: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    crm_Target_Homepage: {
      findFirst: jest.fn(),
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

// Resend's real payload carries BOTH a `message_id` (the RFC 5322 Message-ID
// header, `<...@...>`) and `email_id` (the id we store as resend_message_id).
// The lookup must use email_id — matching on the header never finds the row.
const RFC_HEADER = "<010001a0fa366c8a-38af97a8@email.example>";
const EVENT_TS = "2026-10-02T04:56:40.848Z";
const bothIdsOpened = JSON.stringify({
  type: "email.opened",
  created_at: "2026-10-02T04:56:41.000Z",
  data: {
    message_id: RFC_HEADER,
    email_id: "re_abc123",
    open: { timestamp: EVENT_TS, ipAddress: "2a04::1", userAgent: "Mozilla/5.0" },
  },
});
const bothIdsClicked = JSON.stringify({
  type: "email.clicked",
  created_at: "2026-10-02T04:56:41.000Z",
  data: {
    message_id: RFC_HEADER,
    email_id: "re_abc123",
    click: { link: "https://crm.example/p/acme", timestamp: EVENT_TS },
  },
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
    (prismadb.crm_Target_Email.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(webhookRequest(clickedEvent));
    expect(res.status).toBe(200);
    expect(prismadb.crm_campaign_sends.update).not.toHaveBeenCalled();
    expect(prismadb.crm_Target_Email.update).not.toHaveBeenCalled();
  });

  // The RFC-Message-ID bug (Commit A): events carry both ids; match on email_id.
  describe("matches by email_id, not the RFC Message-ID header", () => {
    it("looks the campaign send up by email_id even when message_id is present", async () => {
      (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
        id: "send-1", clicked_at: null,
      });
      await POST(webhookRequest(bothIdsClicked));
      expect(prismadb.crm_campaign_sends.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resend_message_id: "re_abc123" }),
        }),
      );
    });

    it("falls back to a target email lookup by email_id too", async () => {
      (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue(null);
      (prismadb.crm_Target_Email.findFirst as jest.Mock).mockResolvedValue(null);
      await POST(webhookRequest(bothIdsClicked));
      expect(prismadb.crm_Target_Email.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resend_message_id: "re_abc123" }),
        }),
      );
    });

    it("records the event's own timestamp, not ingest time (campaign click)", async () => {
      (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
        id: "send-1", clicked_at: null,
      });
      await POST(webhookRequest(bothIdsClicked));
      const arg = (prismadb.crm_campaign_sends.update as jest.Mock).mock.calls[0][0];
      expect(arg.data.clicked_at).toEqual(new Date(EVENT_TS));
    });

    it("records the event's own timestamp for an open (campaign open)", async () => {
      (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
        id: "send-1", opened_at: null,
      });
      await POST(webhookRequest(bothIdsOpened));
      const arg = (prismadb.crm_campaign_sends.update as jest.Mock).mock.calls[0][0];
      expect(arg.data.opened_at).toEqual(new Date(EVENT_TS));
    });

    it("falls back to the event's created_at (not the email's) when the sub-timestamp is absent", async () => {
      const EVENT_CREATED = "2026-10-02T05:00:00.000Z";
      const EMAIL_CREATED = "2026-09-30T00:00:00.000Z";
      const noSubTs = JSON.stringify({
        type: "email.opened",
        created_at: EVENT_CREATED, // event emission time
        data: { email_id: "re_abc123", created_at: EMAIL_CREATED }, // email create time (earlier)
      });
      (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
        id: "send-1", opened_at: null,
      });
      await POST(webhookRequest(noSubTs));
      const arg = (prismadb.crm_campaign_sends.update as jest.Mock).mock.calls[0][0];
      expect(arg.data.opened_at).toEqual(new Date(EVENT_CREATED));
    });
  });

  // fork: one-off target outreach emails (no campaign send) get open/click too.
  describe("one-off target outreach emails", () => {
    beforeEach(() => {
      (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue(null); // not a campaign send
    });

    it("records a click on a target email when no campaign send matches", async () => {
      (prismadb.crm_Target_Email.findFirst as jest.Mock).mockResolvedValue({
        id: "te-1", opened_at: null, clicked_at: null,
      });
      const res = await POST(webhookRequest(clickedEvent));
      expect(res.status).toBe(200);
      expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith({
        where: { id: "te-1" },
        data: { clicked_at: expect.any(Date) },
      });
    });

    it("records an open on a target email, only when currently null", async () => {
      const openedEvent = JSON.stringify({ type: "email.opened", data: { email_id: "re_abc123" } });

      (prismadb.crm_Target_Email.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "te-1", opened_at: null, clicked_at: null,
      });
      await POST(webhookRequest(openedEvent));
      expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith({
        where: { id: "te-1" },
        data: { opened_at: expect.any(Date) },
      });

      jest.clearAllMocks();
      (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue(null);
      (prismadb.crm_Target_Email.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "te-1", opened_at: new Date("2026-03-10"), clicked_at: null,
      });
      await POST(webhookRequest(openedEvent));
      expect(prismadb.crm_Target_Email.update).not.toHaveBeenCalled();
    });

    // fork (Commit B): homepage-specific click + event timestamp on target emails.
    it("stamps homepage_clicked_at when the clicked link is the homepage /p/<slug>", async () => {
      (prismadb.crm_Target_Email.findFirst as jest.Mock).mockResolvedValue({
        id: "te-1", targetId: "t-1", opened_at: null, clicked_at: null, homepage_clicked_at: null,
      });
      (prismadb.crm_Target_Homepage.findFirst as jest.Mock).mockResolvedValue({ slug: "acme" });
      // bothIdsClicked's click.link is https://crm.example/p/acme
      await POST(webhookRequest(bothIdsClicked));
      expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith({
        where: { id: "te-1" },
        data: { clicked_at: new Date(EVENT_TS), homepage_clicked_at: new Date(EVENT_TS) },
      });
    });

    it("sets clicked_at but NOT homepage_clicked_at for a non-homepage link", async () => {
      const unsubClick = JSON.stringify({
        type: "email.clicked",
        data: {
          email_id: "re_abc123",
          click: { link: "https://crm.example/api/crm/targets/unsubscribe?token=x", timestamp: EVENT_TS },
        },
      });
      (prismadb.crm_Target_Email.findFirst as jest.Mock).mockResolvedValue({
        id: "te-1", targetId: "t-1", opened_at: null, clicked_at: null, homepage_clicked_at: null,
      });
      (prismadb.crm_Target_Homepage.findFirst as jest.Mock).mockResolvedValue({ slug: "acme" });
      await POST(webhookRequest(unsubClick));
      expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith({
        where: { id: "te-1" },
        data: { clicked_at: new Date(EVENT_TS) },
      });
    });

    it("records the event's own timestamp for a target-email open", async () => {
      (prismadb.crm_Target_Email.findFirst as jest.Mock).mockResolvedValue({
        id: "te-1", targetId: "t-1", opened_at: null, clicked_at: null, homepage_clicked_at: null,
      });
      await POST(webhookRequest(bothIdsOpened));
      expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith({
        where: { id: "te-1" },
        data: { opened_at: new Date(EVENT_TS) },
      });
    });
  });
});
