jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Target_Email: { findUnique: jest.fn() },
    crm_Targets: { update: jest.fn() },
  },
}));
import { prismadb } from "@/lib/prisma";
import { GET, POST } from "@/app/api/crm/targets/unsubscribe/route";

const URL_ = "https://x/api/crm/targets/unsubscribe";

beforeEach(() => jest.clearAllMocks());

describe("GET (safe — never mutates)", () => {
  it("returns a confirm form that POSTs back, without touching the DB", async () => {
    (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue({ id: "e1", targetId: "t1" });
    const res = await GET(new Request(`${URL_}?token=tok`));
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toContain('method="POST"');
    expect(body).toContain("token=tok");
    expect(body).toContain("Unsubscribe</button>");
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });

  it("returns the same 200 form for an unknown or missing token (no enumeration)", async () => {
    (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await GET(new Request(`${URL_}?token=nope`));
    expect(res.status).toBe(200);
    expect((await res.text())).toContain('method="POST"');
    const res2 = await GET(new Request(URL_));
    expect(res2.status).toBe(200);
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });

  it("escapes the token in the HTML", async () => {
    const res = await GET(new Request(`${URL_}?token=${encodeURIComponent('"><script>x</script>')}`));
    expect(await res.text()).not.toContain("<script>x</script>");
  });
});

describe("POST (mutates)", () => {
  it("sets do_not_email for a valid token (query token, RFC 8058 one-click body)", async () => {
    (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue({ id: "e1", targetId: "t1" });
    const res = await POST(
      new Request(`${URL_}?token=tok`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      })
    );
    expect(res.status).toBe(200);
    expect(prismadb.crm_Target_Email.findUnique).toHaveBeenCalledWith({ where: { unsubscribe_token: "tok" } });
    expect(prismadb.crm_Targets.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { do_not_email: true, do_not_email_at: expect.any(Date) },
    });
  });

  it("accepts the token from the form body when not in the query", async () => {
    (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue({ id: "e1", targetId: "t1" });
    const res = await POST(
      new Request(URL_, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "token=tok2",
      })
    );
    expect(res.status).toBe(200);
    expect(prismadb.crm_Target_Email.findUnique).toHaveBeenCalledWith({ where: { unsubscribe_token: "tok2" } });
    expect(prismadb.crm_Targets.update).toHaveBeenCalledTimes(1);
  });

  it("does not update for an unknown token and still returns 200", async () => {
    (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(new Request(`${URL_}?token=nope`, { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("unsubscribed");
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });

  it("does not touch the DB and returns 200 when no token is supplied", async () => {
    const res = await POST(new Request(URL_, { method: "POST" }));
    expect(res.status).toBe(200);
    expect(prismadb.crm_Target_Email.findUnique).not.toHaveBeenCalled();
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });
});
