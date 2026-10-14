jest.mock("@/lib/public/leads-rate-limit", () => ({
  checkPublicLeadsRateLimit: jest.fn().mockResolvedValue(true),
  getClientIp: jest.fn().mockReturnValue("203.0.113.1"),
}));
jest.mock("@/lib/crm/leads/intake-website-lead", () => ({
  intakeWebsiteLead: jest.fn(),
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { intakeWebsiteLead } from "@/lib/crm/leads/intake-website-lead";
import { POST } from "../route";

const intake = intakeWebsiteLead as jest.Mock;
const UUID = "550e8400-e29b-41d4-a716-446655440000";

const validBody = {
  externalId: UUID,
  source: "vensailabs.in/contact",
  submittedAt: "2026-10-12T16:00:00.000Z",
  name: "Jane Doe",
  company: "Acme Ltd",
  email: "jane@example.com",
  phone: "+91 98765 43210",
  country: "India",
  serviceRequired: "Software Development",
  projectType: "New Project / Build from Scratch",
  budgetRange: "$10k–$25k",
  description: "Need a CRM integration.",
};

function makeRequest(opts: {
  auth?: string;
  body?: object;
  idempotencyKey?: string;
}) {
  const body = opts.body ?? validBody;
  return new Request("http://localhost/api/public/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: opts.auth ?? "Bearer test-secret-key-123456",
      ...(opts.idempotencyKey !== undefined
        ? { "Idempotency-Key": opts.idempotencyKey }
        : { "Idempotency-Key": UUID }),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.WEBSITE_LEADS_API_KEY = "test-secret-key-123456";
});

describe("POST /api/public/leads", () => {
  it("returns 401 when Authorization is missing", async () => {
    const res = await POST(makeRequest({ auth: "" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(intake).not.toHaveBeenCalled();
  });

  it("returns 401 when Bearer token is wrong", async () => {
    const res = await POST(makeRequest({ auth: "Bearer wrong-key" }));
    expect(res.status).toBe(401);
    expect(intake).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(
      makeRequest({
        body: { ...validBody, email: "not-an-email", name: "" },
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.fields).toBeDefined();
    expect(intake).not.toHaveBeenCalled();
  });

  it("returns 201 on successful create", async () => {
    intake.mockResolvedValue({ ok: true, leadId: "lead-1", created: true });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, leadId: "lead-1" });
    expect(intake).toHaveBeenCalledWith(expect.objectContaining({ externalId: UUID }));
  });

  it("returns 200 when externalId already exists (idempotent)", async () => {
    intake.mockResolvedValue({ ok: true, leadId: "lead-existing", created: false });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, leadId: "lead-existing" });
  });
});
