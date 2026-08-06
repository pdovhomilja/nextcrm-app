jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    calendarConnection: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock("@/lib/crm/calendar/google", () => ({
  getCalendarClientForConnection: jest.fn(),
}));

jest.mock("@/lib/crm/calendar/google-normalize", () => ({
  normalizeGoogleEvent: jest.fn(),
}));

jest.mock("@/lib/crm/calendar/sync", () => ({
  upsertCalendarEvent: jest.fn(),
}));

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getCalendarClientForConnection } from "@/lib/crm/calendar/google";
import { normalizeGoogleEvent } from "@/lib/crm/calendar/google-normalize";
import { upsertCalendarEvent } from "@/lib/crm/calendar/sync";
import { googleCalendarSyncConnection } from "../google-sync-connection";

// createFunction is called exactly once, at module load time — capture the
// config before any test's clearAllMocks() wipes the mock's call history.
const registeredConfig = (inngest.createFunction as jest.Mock).mock.calls[0][0];

const findConnection = prismadb.calendarConnection.findUnique as jest.Mock;
const updateConnection = prismadb.calendarConnection.update as jest.Mock;
const getClient = getCalendarClientForConnection as jest.Mock;
const normalize = normalizeGoogleEvent as jest.Mock;
const upsert = upsertCalendarEvent as jest.Mock;

const handler = googleCalendarSyncConnection as unknown as (args: {
  event: { data: { connectionId: string } };
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> };
}) => Promise<unknown>;

function run(connectionId: string) {
  const stepNames: string[] = [];
  return {
    result: handler({
      event: { data: { connectionId } },
      step: {
        run: (name, fn) => {
          stepNames.push(name);
          return fn();
        },
      },
    }),
    stepNames,
  };
}

const connection = {
  id: "conn1",
  accountEmail: "rep@acme.com",
  isActive: true,
  syncToken: "tok-1",
};

let list: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  findConnection.mockResolvedValue(connection);
  updateConnection.mockResolvedValue({});
  normalize.mockReturnValue({ skip: "no-counterparty" });
  upsert.mockResolvedValue({ action: "updated" });
  list = jest.fn().mockResolvedValue({ data: { items: [], nextPageToken: undefined } });
  getClient.mockReturnValue({ events: { list } });
});

describe("googleCalendarSyncConnection config", () => {
  it("registers with the expected function id, event trigger, and retries", () => {
    expect(registeredConfig.id).toBe("crm-google-calendar-sync-connection");
    expect(registeredConfig.triggers).toEqual([{ event: "crm/calendar.google-sync" }]);
    expect(registeredConfig.retries).toBe(3);
  });
});

describe("googleCalendarSyncConnection", () => {
  it("falls back to a full window sync when the syncToken list returns 410 (token expired)", async () => {
    // Google expires sync tokens (typically ~1 week); a 410 means "token too
    // old, do a fresh full sync" — NOT an error to surface to the connection.
    list
      .mockRejectedValueOnce(Object.assign(new Error("Gone"), { code: 410 }))
      .mockResolvedValue({ data: { items: [], nextPageToken: undefined } });

    const { result } = run("conn1");
    const res = await result;

    expect(list).toHaveBeenCalledTimes(2);
    // First call used the stored incremental token.
    expect(list).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ calendarId: "primary", singleEvents: true, syncToken: "tok-1" })
    );
    // Second call dropped syncToken and widened to a ±WINDOW_DAYS window.
    const fullWindow = list.mock.calls[1][0];
    expect(fullWindow).not.toHaveProperty("syncToken");
    expect(fullWindow).toHaveProperty("timeMin");
    expect(fullWindow).toHaveProperty("timeMax");
    // The expired token is NOT persisted back.
    expect(updateConnection).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: expect.objectContaining({ lastSyncError: null }),
    });
    expect(res).toEqual({ events: 0, created: 0, updated: 0, cancelled: 0, skipped: 0 });
    expect(updateConnection.mock.calls[0][0].data).not.toHaveProperty("syncToken", "tok-1");
  });

  it("does not fall back for a non-410 syncToken error — records lastSyncError and rethrows", async () => {
    const error = Object.assign(new Error("Rate Limit Exceeded"), { code: 429 });
    list.mockRejectedValue(error);

    const { result } = run("conn1");
    await expect(result).rejects.toThrow("Rate Limit Exceeded");

    expect(list).toHaveBeenCalledTimes(1);
    // 429 is not an auth revocation, so the connection stays active.
    expect(updateConnection).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncError: "Rate Limit Exceeded" },
    });
    expect(updateConnection.mock.calls[0][0].data).not.toHaveProperty("isActive");
  });

  it("deactivates the connection on an auth revocation error (401) so sync stops in both directions", async () => {
    const error = Object.assign(new Error("Invalid Credentials"), { code: 401 });
    list.mockRejectedValue(error);

    const { result } = run("conn1");
    await expect(result).rejects.toThrow("Invalid Credentials");

    expect(updateConnection).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncError: "Invalid Credentials", isActive: false },
    });
  });

  it("goes straight to a full window sync for a connection with no stored syncToken", async () => {
    findConnection.mockResolvedValue({ ...connection, syncToken: null });

    const { result } = run("conn1");
    await result;

    expect(list).toHaveBeenCalledTimes(1);
    const params = list.mock.calls[0][0];
    expect(params).not.toHaveProperty("syncToken");
    expect(params).toHaveProperty("timeMin");
    expect(params).toHaveProperty("timeMax");
  });

  it("skips without listing when the connection is missing", async () => {
    findConnection.mockResolvedValue(null);
    const { result } = run("conn1");
    expect(await result).toEqual({ skipped: true });
    expect(list).not.toHaveBeenCalled();
    expect(updateConnection).not.toHaveBeenCalled();
  });

  it("skips without listing when the connection is deactivated", async () => {
    findConnection.mockResolvedValue({ ...connection, isActive: false });
    const { result } = run("conn1");
    expect(await result).toEqual({ skipped: true });
    expect(list).not.toHaveBeenCalled();
  });

  it("processes paginated items through normalize + upsert, skipping normalized skips, and persists nextSyncToken", async () => {
    const items = [
      { id: "ev1", start: { dateTime: "2026-07-21T10:00:00Z" } },
      { id: "ev2", start: { dateTime: "2026-07-21T11:00:00Z" } },
    ];
    list
      .mockResolvedValueOnce({
        data: { items, nextPageToken: "page2", nextSyncToken: "tok-2" },
      })
      .mockResolvedValueOnce({
        data: { items: [], nextPageToken: undefined, nextSyncToken: "tok-2" },
      });

    normalize.mockImplementation((ev: { id: string }) =>
      ev.id === "ev1" ? { skip: "declined" } : { id: "ev2" }
    );
    upsert.mockResolvedValue({ action: "updated" });

    const { result } = run("conn1");
    const res = await result;

    expect(list).toHaveBeenCalledTimes(2);
    // Pagination: the second page reused the syncToken continuation.
    expect(list).toHaveBeenNthCalledWith(2, expect.objectContaining({ pageToken: "page2" }));
    expect(normalize).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({ id: "ev2" });
    expect(res).toEqual({ events: 2, created: 0, updated: 1, cancelled: 0, skipped: 1 });
    expect(updateConnection).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: expect.objectContaining({
        syncToken: "tok-2",
        lastSyncedAt: expect.any(Date),
        lastSyncError: null,
      }),
    });
  });
});
