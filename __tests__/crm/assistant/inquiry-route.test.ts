// Covers POST /api/crm/assistant/inquiry — the narrow, idempotent write endpoint
// the public AI assistants (website chat + voice agent, via n8n) call to record a
// lead and what they talked about. DB is mocked; createWebLead runs for real so the
// lead-creation path (source/status/assignee + crm/lead.saved) is exercised.

const tx = {
  crm_Activities: { create: jest.fn() },
  crm_ActivityLinks: { create: jest.fn() },
  crm_Assistant_Inquiries: { update: jest.fn() },
};

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Assistant_Inquiries: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    crm_Leads: { findFirst: jest.fn(), create: jest.fn() },
    crm_Lead_Sources: { findUnique: jest.fn() },
    crm_Lead_Statuses: { findUnique: jest.fn() },
    users: { findUnique: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));

jest.mock("@/lib/crm/assistant/rate-limit", () => ({
  checkAssistantRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { checkAssistantRateLimit } from "@/lib/crm/assistant/rate-limit";
import { POST } from "@/app/api/crm/assistant/inquiry/route";
import { LEAD_SOURCE_BY_CHANNEL } from "@/lib/crm/assistant/record-inquiry";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const db = prismadb as unknown as {
  crm_Assistant_Inquiries: { findUnique: jest.Mock; create: jest.Mock; deleteMany: jest.Mock };
  crm_Leads: { findFirst: jest.Mock; create: jest.Mock };
  crm_Lead_Sources: { findUnique: jest.Mock };
  crm_Lead_Statuses: { findUnique: jest.Mock };
  users: { findUnique: jest.Mock };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};
const rateLimit = checkAssistantRateLimit as jest.Mock;
const sendEvent = inngest.send as jest.Mock;

const TOKEN = "a".repeat(40);
const OLD_ENV = process.env;

function body(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: "chat-sess-1:turn-7",
    source: "website_chat",
    sessionId: "chat-sess-1",
    contact: { name: "Jane Doe", email: " Jane@Example.com ", phone: "(913) 555-0142" },
    inquiry: {
      intent: "sales",
      serviceInterest: "Website redesign",
      summary: "Wants a quote for a 10-page WordPress rebuild.",
      urgency: "normal",
    },
    ...overrides,
  };
}

function req(payload: unknown, auth: string | null = `Bearer ${TOKEN}`) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth !== null) headers.authorization = auth;
  return new Request("http://localhost/api/crm/assistant/inquiry", {
    method: "POST",
    headers,
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...OLD_ENV, ASSISTANT_TOKEN: TOKEN };
  rateLimit.mockResolvedValue({ success: true });
  db.crm_Assistant_Inquiries.findUnique.mockResolvedValue(null);
  db.crm_Assistant_Inquiries.create.mockResolvedValue({ id: "inq-1" });
  db.crm_Assistant_Inquiries.deleteMany.mockResolvedValue({ count: 1 });
  db.crm_Leads.findFirst.mockResolvedValue(null);
  db.$queryRaw.mockResolvedValue([]);
  db.crm_Lead_Sources.findUnique.mockResolvedValue({ id: "src-web" });
  db.crm_Lead_Statuses.findUnique.mockResolvedValue({ id: "status-new" });
  db.users.findUnique.mockResolvedValue({ id: "user-shaun" });
  db.crm_Leads.create.mockImplementation(async ({ data }: any) => ({ id: "lead-new", ...data }));
  tx.crm_Activities.create.mockResolvedValue({ id: "act-1" });
  tx.crm_ActivityLinks.create.mockResolvedValue({ id: "link-1" });
  tx.crm_Assistant_Inquiries.update.mockResolvedValue({});
  db.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx));
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe("auth", () => {
  it("401s with no Authorization header and writes nothing", async () => {
    const res = await POST(req(body(), null));
    expect(res.status).toBe(401);
    expect(db.crm_Assistant_Inquiries.create).not.toHaveBeenCalled();
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
  });

  it("401s with a wrong token", async () => {
    const res = await POST(req(body(), `Bearer ${"b".repeat(40)}`));
    expect(res.status).toBe(401);
    expect(db.crm_Assistant_Inquiries.create).not.toHaveBeenCalled();
  });

  it("401s with a token that is a prefix of the real one", async () => {
    const res = await POST(req(body(), `Bearer ${TOKEN.slice(0, 20)}`));
    expect(res.status).toBe(401);
  });

  it("does not accept NEXTCRM_TOKEN (the website-form token)", async () => {
    process.env.NEXTCRM_TOKEN = "website-form-token-website-form-token";
    const res = await POST(req(body(), "Bearer website-form-token-website-form-token"));
    expect(res.status).toBe(401);
  });

  it("401s (fails closed) when ASSISTANT_TOKEN is unset, without leaking config", async () => {
    delete process.env.ASSISTANT_TOKEN;
    const res = await POST(req(body()));
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toMatch(/ASSISTANT_TOKEN/);
  });

  it("401s when ASSISTANT_TOKEN is too short to be a real secret", async () => {
    process.env.ASSISTANT_TOKEN = "short";
    const res = await POST(req(body(), "Bearer short"));
    expect(res.status).toBe(401);
  });

  it("accepts the right token", async () => {
    const res = await POST(req(body()));
    expect(res.status).toBe(200);
  });

  it("429s when rate limited, before touching the DB", async () => {
    rateLimit.mockResolvedValue({ success: false });
    const res = await POST(req(body()));
    expect(res.status).toBe(429);
    expect(db.crm_Assistant_Inquiries.findUnique).not.toHaveBeenCalled();
  });
});

describe("validation", () => {
  it("400s on malformed JSON", async () => {
    const res = await POST(req("{not json"));
    expect(res.status).toBe(400);
  });

  it("400s with field errors when idempotencyKey is missing", async () => {
    const { idempotencyKey: _omit, ...rest } = body();
    const res = await POST(req(rest));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.fieldErrors.idempotencyKey).toBeDefined();
  });

  it("400s when neither email nor phone is supplied", async () => {
    const res = await POST(req(body({ contact: { name: "Jane Doe" } })));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.contact).toBeDefined();
  });

  it("400s on an invalid email", async () => {
    const res = await POST(req(body({ contact: { email: "not-an-email" } })));
    expect(res.status).toBe(400);
  });

  it("400s on an unparseable phone with no email", async () => {
    const res = await POST(req(body({ contact: { phone: "12" } })));
    expect(res.status).toBe(400);
  });

  it("400s on an unknown source / intent", async () => {
    expect((await POST(req(body({ source: "sms" })))).status).toBe(400);
    expect(
      (await POST(req(body({ inquiry: { intent: "spam", summary: "x", urgency: "normal" } })))).status
    ).toBe(400);
  });

  it("400s when the summary exceeds the length cap", async () => {
    const res = await POST(
      req(body({ inquiry: { intent: "sales", summary: "x".repeat(4001), urgency: "normal" } }))
    );
    expect(res.status).toBe(400);
  });

  it("rejects unknown top-level fields (no smuggling ids)", async () => {
    const res = await POST(req(body({ leadId: "some-other-lead" })));
    expect(res.status).toBe(400);
  });
});

describe("lead matching", () => {
  it("matches an existing lead by normalized email first, and never queries phone", async () => {
    db.crm_Leads.findFirst.mockResolvedValue({ id: "lead-by-email" });

    const res = await POST(req(body()));
    const json = await res.json();

    expect(db.crm_Leads.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          email: { equals: "jane@example.com", mode: "insensitive" },
        }),
      })
    );
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
    expect(json).toEqual({
      status: "success",
      leadId: "lead-by-email",
      activityId: "act-1",
      leadCreated: false,
      duplicate: false,
    });
  });

  it("falls back to phone when no lead has the email", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "lead-by-phone" }]);

    const json = await (await POST(req(body()))).json();

    expect(db.crm_Leads.findFirst).toHaveBeenCalled();
    expect(db.$queryRaw).toHaveBeenCalled();
    const params = db.$queryRaw.mock.calls[0].slice(1);
    expect(params).toContainEqual(["19135550142", "9135550142"]);
    expect(json.leadId).toBe("lead-by-phone");
    expect(json.leadCreated).toBe(false);
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
  });

  it("matches by phone alone when no email is given", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "lead-by-phone" }]);
    const json = await (
      await POST(req(body({ source: "voice_call", contact: { phone: "+1 913 555 0142" } })))
    ).json();
    expect(db.crm_Leads.findFirst).not.toHaveBeenCalled();
    expect(json.leadId).toBe("lead-by-phone");
  });

  it("creates a lead via createWebLead when nothing matches", async () => {
    const json = await (await POST(req(body()))).json();

    expect(db.crm_Leads.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          phone: "+19135550142",
          lead_source_id: "src-web",
          lead_status_id: "status-new",
          assigned_to: "user-shaun",
        }),
      })
    );
    expect(sendEvent).toHaveBeenCalledWith({
      name: "crm/lead.saved",
      data: { record_id: "lead-new" },
    });
    expect(json).toEqual({
      status: "success",
      leadId: "lead-new",
      activityId: "act-1",
      leadCreated: true,
      duplicate: false,
    });
  });
});

describe("lead source", () => {
  it("files a lead created from the website chat under AI Website Chat", async () => {
    await POST(req(body()));
    expect(db.crm_Lead_Sources.findUnique).toHaveBeenCalledWith({ where: { name: "AI Website Chat" } });
  });

  it("files a lead created from a phone call under AI Phone Assistant", async () => {
    await POST(req(body({ source: "voice_call" })));
    expect(db.crm_Lead_Sources.findUnique).toHaveBeenCalledWith({ where: { name: "AI Phone Assistant" } });
  });

  it("every channel's source name is created by the lead-sources migration", () => {
    // createWebLead looks the source up by name; a name with no row silently leaves
    // the lead with no source, so the mapping and the migration must agree.
    const sql = readFileSync(
      join(process.cwd(), "prisma/migrations/20261018120000_assistant_lead_sources/migration.sql"),
      "utf8"
    );
    for (const name of Object.values(LEAD_SOURCE_BY_CHANNEL)) {
      expect(sql).toContain(`('${name}')`);
    }
  });
});

describe("activity", () => {
  it("records a website chat as a note linked to the lead", async () => {
    await POST(req(body()));

    const data = tx.crm_Activities.create.mock.calls[0][0].data;
    expect(data.type).toBe("note");
    expect(data.status).toBe("completed");
    expect(data.description).toBe("Wants a quote for a 10-page WordPress rebuild.");
    expect(data.metadata).toEqual(
      expect.objectContaining({
        origin: "ai_assistant",
        source: "website_chat",
        sessionId: "chat-sess-1",
        intent: "sales",
        urgency: "normal",
        serviceInterest: "Website redesign",
        idempotencyKey: "chat-sess-1:turn-7",
      })
    );
    expect(tx.crm_ActivityLinks.create).toHaveBeenCalledWith({
      data: { activityId: "act-1", entityType: "lead", entityId: "lead-new" },
    });
  });

  it("records a voice call as a call, flags urgency and keeps the booking reference", async () => {
    await POST(
      req(
        body({
          source: "voice_call",
          inquiry: { intent: "booking", summary: "Booked a discovery call.", urgency: "urgent" },
          booking: { calBookingUid: "cal_abc123", startTime: "2026-10-20T15:00:00.000Z" },
        })
      )
    );

    const data = tx.crm_Activities.create.mock.calls[0][0].data;
    expect(data.type).toBe("call");
    expect(data.title).toMatch(/urgent/i);
    expect(data.metadata.booking).toEqual({
      calBookingUid: "cal_abc123",
      startTime: "2026-10-20T15:00:00.000Z",
    });
  });

  it("marks the idempotency row complete in the same transaction as the activity", async () => {
    await POST(req(body()));
    expect(tx.crm_Assistant_Inquiries.update).toHaveBeenCalledWith({
      where: { idempotencyKey: "chat-sess-1:turn-7" },
      data: expect.objectContaining({
        leadId: "lead-new",
        activityId: "act-1",
        leadCreated: true,
        completedAt: expect.any(Date),
      }),
    });
  });
});

describe("idempotency", () => {
  const completed = {
    id: "inq-1",
    idempotencyKey: "chat-sess-1:turn-7",
    leadId: "lead-orig",
    activityId: "act-orig",
    leadCreated: true,
    completedAt: new Date(),
    createdAt: new Date(),
  };

  it("replays the original result for a repeated key without writing anything", async () => {
    db.crm_Assistant_Inquiries.findUnique.mockResolvedValue(completed);

    const res = await POST(req(body()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "success",
      leadId: "lead-orig",
      activityId: "act-orig",
      leadCreated: true,
      duplicate: true,
    });
    expect(db.crm_Assistant_Inquiries.create).not.toHaveBeenCalled();
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
    expect(tx.crm_Activities.create).not.toHaveBeenCalled();
  });

  it("replays when a concurrent request wins the unique-key race (P2002)", async () => {
    db.crm_Assistant_Inquiries.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(completed);
    db.crm_Assistant_Inquiries.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    const json = await (await POST(req(body()))).json();
    expect(json.duplicate).toBe(true);
    expect(json.leadId).toBe("lead-orig");
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
    expect(tx.crm_Activities.create).not.toHaveBeenCalled();
  });

  it("409s (retryable) while the original request for the key is still in flight", async () => {
    db.crm_Assistant_Inquiries.findUnique.mockResolvedValue({
      ...completed,
      leadId: null,
      activityId: null,
      completedAt: null,
      createdAt: new Date(),
    });

    const res = await POST(req(body()));
    expect(res.status).toBe(409);
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
  });

  it("reclaims a stale, never-completed claim and processes the request", async () => {
    db.crm_Assistant_Inquiries.findUnique.mockResolvedValueOnce({
      ...completed,
      leadId: null,
      activityId: null,
      completedAt: null,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    const res = await POST(req(body()));
    expect(res.status).toBe(200);
    expect(db.crm_Assistant_Inquiries.deleteMany).toHaveBeenCalledWith({
      where: { id: "inq-1", completedAt: null },
    });
    expect((await res.json()).duplicate).toBe(false);
  });

  it("releases the claim when the write fails, so a retry can succeed", async () => {
    db.$transaction.mockRejectedValue(new Error("db down: host=10.0.0.5"));

    const res = await POST(req(body()));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toMatch(/10\.0\.0\.5|db down/);
    expect(db.crm_Assistant_Inquiries.deleteMany).toHaveBeenCalledWith({
      where: { idempotencyKey: "chat-sess-1:turn-7", completedAt: null },
    });
  });
});
