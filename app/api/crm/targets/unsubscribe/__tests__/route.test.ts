jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Target_Email: { findUnique: jest.fn() },
    crm_Targets: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { GET, POST } from "@/app/api/crm/targets/unsubscribe/route";

const URL_ = "https://x/api/crm/targets/unsubscribe";
const TOK = "6f1c2a4e-3b5d-4e7f-8a9b-0c1d2e3f4a5b";
const TOK2 = "7a2d3b5f-4c6e-4f80-9bac-1d2e3f4a5b6c";
const TARGET_ID = "11111111-1111-4111-8111-111111111111";

const emailRow = { id: "e1", targetId: TARGET_ID };
const mocks = {
  emailFind: prismadb.crm_Target_Email.findUnique as jest.Mock,
  targetFind: prismadb.crm_Targets.findUnique as jest.Mock,
  update: prismadb.crm_Targets.update as jest.Mock,
  updateMany: prismadb.crm_Targets.updateMany as jest.Mock,
  audit: writeAuditLog as jest.Mock,
};

const expectNoMutation = () => {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.updateMany).not.toHaveBeenCalled();
  expect(mocks.audit).not.toHaveBeenCalled();
};

beforeEach(() => jest.clearAllMocks());

describe("GET (safe — never mutates)", () => {
  it("returns a confirm form that POSTs back, without touching the DB", async () => {
    mocks.emailFind.mockResolvedValue(emailRow);
    const res = await GET(new Request(`${URL_}?token=${TOK}`));
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toContain('method="POST"');
    expect(body).toContain(`token=${TOK}`);
    expect(body).toContain("Unsubscribe</button>");
    expect(mocks.emailFind).not.toHaveBeenCalled();
    expectNoMutation();
  });

  it("returns the same 200 form for a non-UUID or missing token, no DB call, no throw", async () => {
    const res = await GET(new Request(`${URL_}?token=not-a-uuid`));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('method="POST"');
    const res2 = await GET(new Request(URL_));
    expect(res2.status).toBe(200);
    expect(mocks.emailFind).not.toHaveBeenCalled();
    expectNoMutation();
  });

  it("escapes the token in the HTML", async () => {
    const res = await GET(new Request(`${URL_}?token=${encodeURIComponent('"><script>x</script>')}`));
    expect(await res.text()).not.toContain("<script>x</script>");
  });

  it("sets lang, no-store and noindex headers", async () => {
    const res = await GET(new Request(`${URL_}?token=${TOK}`));
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(await res.text()).toContain('<html lang="en">');
  });
});

describe("POST (mutates)", () => {
  it("suppresses every non-deleted target sharing the email (case-insensitive) + audits", async () => {
    mocks.emailFind.mockResolvedValue(emailRow);
    mocks.targetFind.mockResolvedValue({ email: "Jane@Acme.com" });
    const res = await POST(
      new Request(`${URL_}?token=${TOK}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(mocks.emailFind).toHaveBeenCalledWith({ where: { unsubscribe_token: TOK } });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { email: { equals: "Jane@Acme.com", mode: "insensitive" }, deletedAt: null },
      data: { do_not_email: true, do_not_email_at: expect.any(Date) },
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledWith({
      entityType: "target",
      entityId: TARGET_ID,
      action: "updated",
      changes: [{ field: "do_not_email", old: false, new: true }],
      userId: null,
    });
  });

  it("falls back to updating just the target when it has no email", async () => {
    mocks.emailFind.mockResolvedValue(emailRow);
    mocks.targetFind.mockResolvedValue({ email: null });
    await POST(new Request(`${URL_}?token=${TOK}`, { method: "POST" }));
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { do_not_email: true, do_not_email_at: expect.any(Date) },
    });
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });

  it("accepts the token from the form body when not in the query", async () => {
    mocks.emailFind.mockResolvedValue(emailRow);
    mocks.targetFind.mockResolvedValue({ email: "a@b.co" });
    const res = await POST(
      new Request(URL_, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `token=${TOK2}`,
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.emailFind).toHaveBeenCalledWith({ where: { unsubscribe_token: TOK2 } });
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
  });

  it("does not update for a valid-UUID but unknown token and still returns 200", async () => {
    mocks.emailFind.mockResolvedValue(null);
    const res = await POST(new Request(`${URL_}?token=${TOK}`, { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("unsubscribed");
    expectNoMutation();
  });

  it("non-UUID token: 200, no DB call, no mutation (regression: Prisma P2007 -> 500)", async () => {
    // Emulate the real column behaviour: a non-UUID lookup throws.
    mocks.emailFind.mockImplementation(async () => {
      throw new Error("P2007: invalid uuid");
    });
    const res = await POST(new Request(`${URL_}?token=not-a-uuid`, { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("unsubscribed");
    expect(mocks.emailFind).not.toHaveBeenCalled();
    expectNoMutation();
  });

  it("does not touch the DB and returns 200 when no token is supplied", async () => {
    const res = await POST(new Request(URL_, { method: "POST" }));
    expect(res.status).toBe(200);
    expect(mocks.emailFind).not.toHaveBeenCalled();
    expectNoMutation();
  });
});
