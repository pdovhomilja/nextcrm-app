jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: { findUnique: jest.fn(), update: jest.fn() },
    crm_Targets: { updateMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { GET, POST } from "@/app/api/campaigns/unsubscribe/route";

const findUnique = prismadb.crm_campaign_sends.findUnique as jest.Mock;
const update = prismadb.crm_campaign_sends.update as jest.Mock;
const updateMany = prismadb.crm_Targets.updateMany as jest.Mock;
const url = (token?: string) =>
  `http://localhost/api/campaigns/unsubscribe${token ? `?token=${token}` : ""}`;

beforeEach(() => {
  jest.clearAllMocks();
  updateMany.mockResolvedValue({ count: 1 });
  update.mockResolvedValue({});
});

describe("campaign unsubscribe — GET is a safe confirm (never mutates)", () => {
  it("shows a POST confirm form and does NOT touch the DB", async () => {
    const res = await GET(new Request(url("tok-1")));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('method="POST"');
    expect(body.toLowerCase()).toContain("unsubscribe");
    // A link scanner GET must not unsubscribe anyone.
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("campaign unsubscribe — POST mutates", () => {
  it("stamps unsubscribed_at and suppresses the address on a valid token", async () => {
    findUnique.mockResolvedValue({
      id: "send-1", target_id: "t-1", email: "jane@acme.com", unsubscribed_at: null,
    });
    const res = await POST(new Request(url("tok-1"), { method: "POST" }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { unsubscribe_token: "tok-1" },
      data: { unsubscribed_at: expect.any(Date) },
    });
    expect(updateMany).toHaveBeenCalled();
  });

  it("reads the token from a form body (one-click / form button)", async () => {
    findUnique.mockResolvedValue({
      id: "send-1", target_id: "t-1", email: "jane@acme.com", unsubscribed_at: null,
    });
    const res = await POST(
      new Request(url(), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "token=tok-body",
      })
    );
    expect(res.status).toBe(200);
    expect(findUnique).toHaveBeenCalledWith({ where: { unsubscribe_token: "tok-body" } });
  });

  it("returns a generic 200 (no enumeration) for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST(new Request(url("nope"), { method: "POST" }));
    expect(res.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns a generic 200 when no token is supplied, without a DB read", async () => {
    const res = await POST(new Request(url(), { method: "POST" }));
    expect(res.status).toBe(200);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
