jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Activities: { findUnique: jest.fn() },
    crm_CalendarEvents: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    calendarConnection: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/crm/calendar/google", () => ({
  getCalendarClientForConnection: jest.fn(),
}));

jest.mock("@/lib/crm/calendar/outbound", () => ({
  decideOutboundAction: jest.fn(),
  buildOutboundEvent: jest.fn(),
  resolveCounterpartyEmail: jest.fn(),
}));

jest.mock("@/inngest/functions/calendar/google-sync-connection", () => ({
  isAuthRevocationError: jest.fn(),
}));

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getCalendarClientForConnection } from "@/lib/crm/calendar/google";
import {
  decideOutboundAction,
  buildOutboundEvent,
  resolveCounterpartyEmail,
} from "@/lib/crm/calendar/outbound";
import { isAuthRevocationError } from "@/inngest/functions/calendar/google-sync-connection";
import { calendarOutboundSync } from "../outbound-sync";

// createFunction is called exactly once, at module load time — capture the
// config it was called with before any test's clearAllMocks() wipes the
// mock's call history.
const registeredConfig = (inngest.createFunction as jest.Mock).mock.calls[0][0];

const findActivity = prismadb.crm_Activities.findUnique as jest.Mock;
const findMappingRows = prismadb.crm_CalendarEvents.findMany as jest.Mock;
const updateManyMapping = prismadb.crm_CalendarEvents.updateMany as jest.Mock;
const createMapping = prismadb.crm_CalendarEvents.create as jest.Mock;
const findConnection = prismadb.calendarConnection.findFirst as jest.Mock;
const updateConnection = prismadb.calendarConnection.update as jest.Mock;
const getClient = getCalendarClientForConnection as jest.Mock;
const decide = decideOutboundAction as jest.Mock;
const build = buildOutboundEvent as jest.Mock;
const resolveCounterparty = resolveCounterpartyEmail as jest.Mock;
const isRevocation = isAuthRevocationError as jest.Mock;

// The handler passed to inngest.createFunction (jest.mock above returns it verbatim).
const handler = calendarOutboundSync as unknown as (args: {
  event: { data: { activityId: string; action: "upsert" | "cancel" } };
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> };
}) => Promise<unknown>;

function run(activityId: string, action: "upsert" | "cancel" = "upsert") {
  const stepNames: string[] = [];
  return {
    result: handler({
      event: { data: { activityId, action } },
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

const activity = {
  id: "act1",
  createdBy: "user1",
  title: "Intro call",
  description: null,
  date: new Date("2026-07-21T10:00:00Z"),
  duration: 30,
  status: "scheduled",
  type: "meeting",
  deletedAt: null,
  links: [{ entityType: "contact", entityId: "c1" }],
};

const connection = { id: "conn1", userId: "user1", scopeLevel: "readwrite" };

const eventBody = {
  summary: "Intro call",
  start: { dateTime: "2026-07-21T10:00:00.000Z" },
  end: { dateTime: "2026-07-21T10:30:00.000Z" },
};

let events: { delete: jest.Mock; patch: jest.Mock; insert: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  findActivity.mockResolvedValue(activity);
  findMappingRows.mockResolvedValue([]);
  findConnection.mockResolvedValue(connection);
  updateManyMapping.mockResolvedValue({});
  createMapping.mockResolvedValue({});
  updateConnection.mockResolvedValue({});
  build.mockReturnValue(eventBody);
  resolveCounterparty.mockResolvedValue("jane@client.com");
  isRevocation.mockReturnValue(false);
  events = {
    delete: jest.fn().mockResolvedValue({}),
    patch: jest.fn().mockResolvedValue({}),
    insert: jest.fn().mockResolvedValue({ data: { id: "gev1", iCalUID: "ical1" } }),
  };
  getClient.mockReturnValue({ events });
});

describe("calendarOutboundSync config", () => {
  it("registers with the expected function id, event trigger, and triggers shape", () => {
    expect(registeredConfig.id).toBe("crm-calendar-outbound-sync");
    expect(Array.isArray(registeredConfig.triggers)).toBe(true);
    expect(registeredConfig.triggers[0].event).toBe("crm/calendar.outbound-sync");
    expect(registeredConfig.triggers).toEqual([{ event: "crm/calendar.outbound-sync" }]);
  });
});

describe("calendarOutboundSync", () => {
  it("skips when decideOutboundAction says skip, without calling Google", async () => {
    decide.mockReturnValue({ do: "skip", reason: "not-a-meeting" });
    const { result } = run("act1");
    expect(await result).toEqual({ pushed: false, reason: "not-a-meeting" });
    expect(getClient).not.toHaveBeenCalled();
  });

  it("inserts a new event and creates the mapping in two separate steps", async () => {
    decide.mockReturnValue({ do: "insert" });
    const { result, stepNames } = run("act1");
    const res = await result;
    expect(events.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        sendUpdates: "all",
        requestBody: eventBody,
      })
    );
    expect(createMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "google",
          externalId: "gev1",
          iCalUID: "ical1",
          connectionId: "conn1",
          activityId: "act1",
          attendeeEmails: ["jane@client.com"],
          status: "scheduled",
        }),
      })
    );
    // Echo-suppression invariant: the persisted startAt/endAt must be derived
    // from the same event body sent to Google, not from some other source.
    const mappingData = createMapping.mock.calls[0][0].data;
    expect(mappingData.startAt).toEqual(activity.date);
    expect(mappingData.endAt).toEqual(new Date(eventBody.end.dateTime));
    expect(res).toEqual({ pushed: true, did: "insert" });
    // The Google insert and the mapping write must be memoized as two
    // separate steps so a retry after the mapping write fails resumes there
    // instead of re-inserting a second real event.
    expect(stepNames).toEqual(["insert-google-event", "create-mapping"]);
  });

  it("patches an existing event and updates the mapping in two separate steps", async () => {
    decide.mockReturnValue({ do: "patch", eventId: "gev1" });
    const { result, stepNames } = run("act1");
    const res = await result;
    expect(events.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        eventId: "gev1",
        sendUpdates: "all",
        requestBody: eventBody,
      })
    );
    expect(updateManyMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        // Scoped to the exact row being patched — never to activityId alone,
        // since an activity can carry more than one crm_CalendarEvents row.
        where: { activityId: "act1", externalId: "gev1" },
        data: expect.objectContaining({
          status: "scheduled",
          attendeeEmails: ["jane@client.com"],
        }),
      })
    );
    const mappingData = updateManyMapping.mock.calls[0][0].data;
    expect(mappingData.startAt).toEqual(activity.date);
    expect(mappingData.endAt).toEqual(new Date(eventBody.end.dateTime));
    expect(res).toEqual({ pushed: true, did: "patch" });
    expect(stepNames).toEqual(["patch-google-event", "update-mapping-patch"]);
  });

  it("deletes an event on cancel and marks the mapping cancelled in two separate steps", async () => {
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    const { result, stepNames } = run("act1", "cancel");
    const res = await result;
    expect(events.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        eventId: "gev1",
        sendUpdates: "all",
      })
    );
    expect(updateManyMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        // Scoped to the exact row being cancelled — never to activityId
        // alone, so an older cancelled-history row is never rewritten.
        where: { activityId: "act1", externalId: "gev1" },
        data: { status: "cancelled" },
      })
    );
    expect(res).toEqual({ pushed: true, did: "delete" });
    expect(stepNames).toEqual(["delete-google-event", "mark-mapping-cancelled"]);
  });

  it("treats a 404 on delete as success (already gone on Google's side)", async () => {
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    events.delete.mockRejectedValue(Object.assign(new Error("Not Found"), { code: 404 }));
    const { result } = run("act1", "cancel");
    const res = await result;
    expect(res).toEqual({ pushed: true, did: "delete" });
    expect(updateManyMapping).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "cancelled" } })
    );
    expect(updateConnection).not.toHaveBeenCalled();
  });

  it("treats a 410 on delete as success (already gone on Google's side)", async () => {
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    events.delete.mockRejectedValue(Object.assign(new Error("Gone"), { code: 410 }));
    const { result } = run("act1", "cancel");
    expect(await result).toEqual({ pushed: true, did: "delete" });
  });

  it("records lastSyncError and rethrows on a non-404/410 delete failure", async () => {
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    const error = Object.assign(new Error("Server error"), { code: 500 });
    events.delete.mockRejectedValue(error);
    isRevocation.mockReturnValue(false);

    const { result } = run("act1", "cancel");
    await expect(result).rejects.toThrow("Server error");

    expect(updateConnection).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncError: "Server error" },
    });
    expect(updateManyMapping).not.toHaveBeenCalled();
  });

  it("deactivates the connection when the failure is an auth revocation", async () => {
    decide.mockReturnValue({ do: "insert" });
    const error = Object.assign(new Error("invalid_grant"), { code: 401 });
    events.insert.mockRejectedValue(error);
    isRevocation.mockReturnValue(true);

    const { result } = run("act1");
    await expect(result).rejects.toThrow("invalid_grant");

    expect(updateConnection).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncError: "invalid_grant", isActive: false },
    });
  });

  it("treats a concurrent duplicate mapping create (P2002) as benign on insert", async () => {
    decide.mockReturnValue({ do: "insert" });
    createMapping.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    const { result } = run("act1");
    expect(await result).toEqual({ pushed: true, did: "insert" });
    expect(updateConnection).not.toHaveBeenCalled();
  });

  it("does not record lastSyncError when the mapping write itself fails (only Google calls are wrapped)", async () => {
    decide.mockReturnValue({ do: "insert" });
    createMapping.mockRejectedValue(Object.assign(new Error("db unavailable"), { code: "P2010" }));
    const { result } = run("act1");
    await expect(result).rejects.toThrow("db unavailable");
    expect(updateConnection).not.toHaveBeenCalled();
  });

  it("does not let a failing calendarConnection.update mask the original Google error", async () => {
    decide.mockReturnValue({ do: "insert" });
    const googleError = Object.assign(new Error("Server error"), { code: 500 });
    events.insert.mockRejectedValue(googleError);
    updateConnection.mockRejectedValue(new Error("connection row locked"));
    const { result } = run("act1");
    await expect(result).rejects.toThrow("Server error");
  });

  it("prefers the connection owning the existing mapping over the deterministic default", async () => {
    findMappingRows.mockResolvedValue([
      {
        source: "google",
        externalId: "gev1",
        status: "scheduled",
        connectionId: "conn-owner",
      },
    ]);
    findConnection.mockImplementation(async ({ where }: { where: { id?: string } }) => {
      if (where.id === "conn-owner") return { id: "conn-owner", userId: "user1", scopeLevel: "readwrite" };
      return connection;
    });
    decide.mockReturnValue({ do: "patch", eventId: "gev1" });
    const { result } = run("act1");
    await result;
    // Resolved on the first (mapping-owned) lookup — the deterministic
    // fallback lookup must not run at all.
    expect(findConnection).toHaveBeenCalledTimes(1);
    expect(findConnection).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "conn-owner" }) })
    );
    expect(getClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: "conn-owner" })
    );
  });

  it("orders the fallback connection lookup deterministically", async () => {
    findMappingRows.mockResolvedValue([]);
    decide.mockReturnValue({ do: "insert" });
    const { result } = run("act1");
    await result;
    expect(findConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    );
  });

  it("looks up mapping rows ordered by createdAt desc (multi-row-per-activity is the steady state)", async () => {
    findMappingRows.mockResolvedValue([]);
    decide.mockReturnValue({ do: "insert" });
    const { result } = run("act1");
    await result;
    expect(findMappingRows).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activityId: "act1" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      })
    );
  });

  it("a calendly row always wins the calendly-owned skip, regardless of row order", async () => {
    // The google row is listed first (as if it were more recent) — the
    // calendly row must still win the skip, since ownership can never be
    // defeated by insertion/ordering accidents.
    findMappingRows.mockResolvedValue([
      { source: "google", externalId: "gev-old", status: "cancelled", connectionId: "conn1" },
      { source: "calendly", externalId: "cal-ev1", status: "scheduled", connectionId: null },
    ]);
    decide.mockImplementation(({ mapping }) =>
      mapping?.source === "calendly" ? { do: "skip", reason: "calendly-owned" } : { do: "insert" }
    );
    const { result } = run("act1");
    expect(await result).toEqual({ pushed: false, reason: "calendly-owned" });
  });

  it("multi-row sequence: insert -> cancel -> reschedule -> edit does not duplicate-insert or resurrect the cancelled row", async () => {
    // Step 1: insert creates row A (ev1, scheduled).
    findMappingRows.mockResolvedValue([]);
    decide.mockReturnValue({ do: "insert" });
    events.insert.mockResolvedValue({ data: { id: "ev1", iCalUID: "ical-ev1" } });
    let { result } = run("act1");
    expect(await result).toEqual({ pushed: true, did: "insert" });
    expect(createMapping).toHaveBeenCalledTimes(1);

    const rowA = { source: "google", externalId: "ev1", status: "scheduled", connectionId: "conn1" };

    // Step 2: cancel flips row A to cancelled.
    jest.clearAllMocks();
    findActivity.mockResolvedValue(activity);
    findConnection.mockResolvedValue(connection);
    updateManyMapping.mockResolvedValue({});
    getClient.mockReturnValue({ events });
    findMappingRows.mockResolvedValue([rowA]);
    decide.mockReturnValue({ do: "delete", eventId: "ev1" });
    events.delete.mockResolvedValue({});
    ({ result } = run("act1", "cancel"));
    expect(await result).toEqual({ pushed: true, did: "delete" });
    expect(updateManyMapping).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activityId: "act1", externalId: "ev1" } })
    );
    const rowACancelled = { ...rowA, status: "cancelled" };

    // Step 3: reschedule inserts row B (ev2, scheduled). Row A stays cancelled
    // history — findMany now returns both rows, most-recent (row B) first.
    jest.clearAllMocks();
    findActivity.mockResolvedValue(activity);
    findConnection.mockResolvedValue(connection);
    createMapping.mockResolvedValue({});
    getClient.mockReturnValue({ events });
    build.mockReturnValue(eventBody);
    resolveCounterparty.mockResolvedValue("jane@client.com");
    findMappingRows.mockResolvedValue([rowACancelled]);
    decide.mockReturnValue({ do: "insert" });
    events.insert.mockResolvedValue({ data: { id: "ev2", iCalUID: "ical-ev2" } });
    ({ result } = run("act1"));
    expect(await result).toEqual({ pushed: true, did: "insert" });
    expect(createMapping).toHaveBeenCalledTimes(1);
    expect(createMapping).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ externalId: "ev2" }) })
    );

    const rowB = { source: "google", externalId: "ev2", status: "scheduled", connectionId: "conn1" };

    // Step 4: edit — findMany (ordered by createdAt desc) returns row B
    // first. The decision must be "patch" against ev2, not a duplicate
    // insert, and row A's cancelled history must not be touched/resurrected.
    jest.clearAllMocks();
    findActivity.mockResolvedValue(activity);
    findConnection.mockResolvedValue(connection);
    updateManyMapping.mockResolvedValue({});
    getClient.mockReturnValue({ events });
    build.mockReturnValue(eventBody);
    resolveCounterparty.mockResolvedValue("jane@client.com");
    findMappingRows.mockResolvedValue([rowB, rowACancelled]);
    decide.mockImplementation(({ mapping }) => ({ do: "patch", eventId: mapping!.externalId }));
    events.patch.mockResolvedValue({});
    ({ result } = run("act1"));
    expect(await result).toEqual({ pushed: true, did: "patch" });
    expect(createMapping).not.toHaveBeenCalled();
    expect(events.patch).toHaveBeenCalledWith(expect.objectContaining({ eventId: "ev2" }));
    // Scoped update — row A (the cancelled history row) must never be
    // touched by this patch's mapping write.
    expect(updateManyMapping).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activityId: "act1", externalId: "ev2" } })
    );
    expect(updateManyMapping).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ externalId: "ev1" }) })
    );
  });

  it("skips a patch/delete rather than substituting an unrelated account when the mapping's connection no longer resolves", async () => {
    findMappingRows.mockResolvedValue([
      { source: "google", externalId: "gev1", status: "scheduled", connectionId: "conn-stale" },
    ]);
    // The mapping-owned lookup (id: conn-stale) misses; only the fallback
    // connection resolves.
    findConnection.mockImplementation(async ({ where }: { where: { id?: string } }) => {
      if (where.id === "conn-stale") return null;
      return connection;
    });
    decide.mockReturnValue({ do: "patch", eventId: "gev1" });
    const { result } = run("act1");
    expect(await result).toEqual({ pushed: false, reason: "connection-mismatch" });
    expect(getClient).not.toHaveBeenCalled();
    expect(events.patch).not.toHaveBeenCalled();
  });

  it("skips a patch rather than substituting an unrelated account when the mapping's connectionId was nulled by a hard-deleted (disconnected) connection", async () => {
    // Disconnecting a Google account hard-deletes the CalendarConnection row;
    // the mapping's connectionId relation is onDelete: SetNull, so every
    // mapping row that account ever created ends up with connectionId: null
    // rather than a dangling stale id.
    findMappingRows.mockResolvedValue([
      { source: "google", externalId: "gev1", status: "scheduled", connectionId: null },
    ]);
    decide.mockReturnValue({ do: "patch", eventId: "gev1" });
    const { result } = run("act1");
    expect(await result).toEqual({ pushed: false, reason: "connection-mismatch" });
    // The mapping-owned lookup must not even run (connectionId is null), and
    // the fallback lookup that does run must not be treated as an
    // authorization to patch — no Google client is constructed, no Google
    // call is made.
    expect(findConnection).toHaveBeenCalledTimes(1);
    expect(getClient).not.toHaveBeenCalled();
    expect(events.patch).not.toHaveBeenCalled();
  });

  it("skips a delete rather than substituting an unrelated account when the mapping's connectionId was nulled by a hard-deleted (disconnected) connection", async () => {
    findMappingRows.mockResolvedValue([
      { source: "google", externalId: "gev1", status: "scheduled", connectionId: null },
    ]);
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    const { result } = run("act1", "cancel");
    expect(await result).toEqual({ pushed: false, reason: "connection-mismatch" });
    expect(getClient).not.toHaveBeenCalled();
    expect(events.delete).not.toHaveBeenCalled();
    expect(updateManyMapping).not.toHaveBeenCalled();
  });

  it("still allows the fallback connection for a fresh insert even when an old mapping's connection no longer resolves", async () => {
    findMappingRows.mockResolvedValue([
      { source: "google", externalId: "gev-old", status: "cancelled", connectionId: "conn-stale" },
    ]);
    findConnection.mockImplementation(async ({ where }: { where: { id?: string } }) => {
      if (where.id === "conn-stale") return null;
      return connection;
    });
    decide.mockReturnValue({ do: "insert" });
    const { result } = run("act1");
    expect(await result).toEqual({ pushed: true, did: "insert" });
    expect(getClient).toHaveBeenCalledWith(expect.objectContaining({ id: "conn1" }));
  });
});
