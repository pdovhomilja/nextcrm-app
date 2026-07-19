jest.mock("@/lib/crm/calendar/calendly-settings", () => ({
  getCalendlySettings: jest.fn(),
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({ ids: ["1"] }) },
}));

import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { getCalendlySettings } from "@/lib/crm/calendar/calendly-settings";
import { inngest } from "@/inngest/client";
import { POST } from "../route";

const settings = getCalendlySettings as jest.Mock;
const send = inngest.send as jest.Mock;
const KEY = "sk";

function sign(body: string) {
  const t = "1721400000";
  const v1 = createHmac("sha256", KEY).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

function makeReq(body: object, signature?: string) {
  const raw = JSON.stringify(body);
  return new NextRequest("http://localhost/api/crm/calendar/webhooks/calendly", {
    method: "POST",
    body: raw,
    headers: {
      "content-type": "application/json",
      ...(signature !== undefined
        ? { "calendly-webhook-signature": signature }
        : { "calendly-webhook-signature": sign(raw) }),
    },
  });
}

const CREATED = {
  event: "invitee.created",
  payload: {
    uri: "https://api.calendly.com/scheduled_events/EV1/invitees/INV1",
    email: "jane@client.com",
    name: "Jane Doe",
    scheduled_event: {
      uri: "https://api.calendly.com/scheduled_events/EV1",
      name: "Intro call",
      start_time: "2026-07-21T10:00:00.000000Z",
      end_time: "2026-07-21T10:30:00.000000Z",
      event_memberships: [{ user_email: "rep@aqunama.com" }],
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  settings.mockResolvedValue({ apiToken: "tok", signingKey: KEY, webhookUri: null });
});

describe("POST /api/crm/calendar/webhooks/calendly", () => {
  it("401 on bad signature", async () => {
    const res = await POST(makeReq(CREATED, "t=1,v1=bad"));
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("401 when no signing key is configured", async () => {
    settings.mockResolvedValue({ apiToken: null, signingKey: null, webhookUri: null });
    const res = await POST(makeReq(CREATED));
    expect(res.status).toBe(401);
  });

  it("forwards invitee.created to inngest and ACKs", async () => {
    const res = await POST(makeReq(CREATED));
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "crm/calendar.event.received",
        data: expect.objectContaining({
          source: "calendly",
          externalId: CREATED.payload.uri,
          title: "Intro call",
          counterpartyEmails: ["jane@client.com"],
          hostEmail: "rep@aqunama.com",
          status: "scheduled",
        }),
      })
    );
  });

  it("maps invitee.canceled to status cancelled", async () => {
    const res = await POST(makeReq({ ...CREATED, event: "invitee.canceled" }));
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "cancelled" }),
      })
    );
  });

  it("ACKs 200 for unhandled event types without sending", async () => {
    const res = await POST(makeReq({ event: "routing_form_submission.created", payload: {} }));
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });
});
