jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { inngest } from "@/inngest/client";
import { emitCalendarOutbound } from "../outbound-emit";

const send = inngest.send as jest.Mock;

describe("emitCalendarOutbound", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("sends the outbound event", async () => {
    send.mockResolvedValue({ ids: ["1"] });
    await emitCalendarOutbound("act1", "upsert");
    expect(send).toHaveBeenCalledWith({
      name: "crm/calendar.outbound-sync",
      data: { activityId: "act1", action: "upsert" },
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("swallows send failures and logs them (never breaks the user's save)", async () => {
    send.mockRejectedValue(new Error("inngest down"));
    await expect(
      emitCalendarOutbound("act1", "cancel")
    ).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[calendar-outbound] emit failed:",
      "inngest down"
    );
  });

  it("returns promptly when send hangs, without an unhandled rejection", async () => {
    jest.useFakeTimers();
    let rejectSend!: (error: Error) => void;
    send.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSend = reject;
        })
    );

    const emitPromise = emitCalendarOutbound("act1", "upsert");

    // Advance past the internal emit timeout without the send ever
    // resolving — the helper must not block the caller waiting on it.
    await jest.advanceTimersByTimeAsync(2000);
    await expect(emitPromise).resolves.toBeUndefined();

    // A rejection arriving after the race has already settled must still
    // be observed (not surface as an unhandled rejection) and logged.
    rejectSend(new Error("late failure"));
    await Promise.resolve();
    await Promise.resolve();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[calendar-outbound] emit failed:",
      "late failure"
    );

    jest.useRealTimers();
  });
});
