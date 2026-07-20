jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { inngest } from "@/inngest/client";
import { emitCalendarOutbound } from "../outbound-emit";

const send = inngest.send as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("emitCalendarOutbound", () => {
  it("sends the outbound event", async () => {
    send.mockResolvedValue({ ids: ["1"] });
    await emitCalendarOutbound("act1", "upsert");
    expect(send).toHaveBeenCalledWith({
      name: "crm/calendar.outbound-sync",
      data: { activityId: "act1", action: "upsert" },
    });
  });

  it("swallows send failures (never breaks the user's save)", async () => {
    send.mockRejectedValue(new Error("inngest down"));
    await expect(emitCalendarOutbound("act1", "cancel")).resolves.toBeUndefined();
  });
});
