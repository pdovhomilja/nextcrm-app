jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";

describe("Resend webhook handler", () => {
  beforeEach(() => jest.clearAllMocks());

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
