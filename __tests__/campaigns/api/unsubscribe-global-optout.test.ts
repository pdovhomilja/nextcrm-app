jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    crm_Targets: {
      updateMany: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { GET } from "@/app/api/campaigns/unsubscribe/route";

describe("unsubscribe global opt-out", () => {
  beforeEach(() => jest.clearAllMocks());

  it("suppresses all targets with the send's id or email", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-1",
      target_id: "t-1",
      email: "jane@acme.com",
      unsubscribed_at: null,
    });
    (prismadb.crm_campaign_sends.update as jest.Mock).mockResolvedValue({});
    (prismadb.crm_Targets.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

    const res = await GET(
      new NextRequest("http://localhost/api/campaigns/unsubscribe?token=tok-1")
    );

    expect(res.status).toBe(200);
    expect(prismadb.crm_Targets.updateMany).toHaveBeenCalledWith({
      where: {
        do_not_email: false,
        OR: [{ id: "t-1" }, { email: "jane@acme.com" }],
      },
      data: { do_not_email: true, do_not_email_at: expect.any(Date) },
    });
  });

  it("still suppresses targets when the send was already unsubscribed", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-1",
      target_id: "t-1",
      email: "jane@acme.com",
      unsubscribed_at: new Date("2026-01-01"),
    });
    (prismadb.crm_Targets.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    await GET(new NextRequest("http://localhost/api/campaigns/unsubscribe?token=tok-1"));

    expect(prismadb.crm_campaign_sends.update).not.toHaveBeenCalled();
    expect(prismadb.crm_Targets.updateMany).toHaveBeenCalledTimes(1);
  });

  it("does not touch targets for an unknown token", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(
      new NextRequest("http://localhost/api/campaigns/unsubscribe?token=bad")
    );

    expect(res.status).toBe(404);
    expect(prismadb.crm_Targets.updateMany).not.toHaveBeenCalled();
  });
});
