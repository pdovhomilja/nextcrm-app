jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Activities: { findUnique: jest.fn() },
    crm_CalendarEvents: {
      findFirst: jest.fn(),
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

import { prismadb } from "@/lib/prisma";
import { getCalendarClientForConnection } from "@/lib/crm/calendar/google";
import {
  decideOutboundAction,
  buildOutboundEvent,
  resolveCounterpartyEmail,
} from "@/lib/crm/calendar/outbound";
import { isAuthRevocationError } from "@/inngest/functions/calendar/google-sync-connection";
import { calendarOutboundSync } from "../outbound-sync";

const findActivity = prismadb.crm_Activities.findUnique as jest.Mock;
const findMapping = prismadb.crm_CalendarEvents.findFirst as jest.Mock;
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
  return handler({
    event: { data: { activityId, action } },
    step: { run: (_name, fn) => fn() },
  });
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
  findMapping.mockResolvedValue(null);
  findConnection.mockResolvedValue(connection);
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

describe("calendarOutboundSync", () => {
  it("skips when decideOutboundAction says skip, without calling Google", async () => {
    decide.mockReturnValue({ do: "skip", reason: "not-a-meeting" });
    const res = await run("act1");
    expect(res).toEqual({ pushed: false, reason: "not-a-meeting" });
    expect(getClient).not.toHaveBeenCalled();
  });

  it("inserts a new event and creates the mapping", async () => {
    decide.mockReturnValue({ do: "insert" });
    const res = await run("act1");
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
    expect(res).toEqual({ pushed: true, did: "insert" });
  });

  it("patches an existing event and updates the mapping", async () => {
    decide.mockReturnValue({ do: "patch", eventId: "gev1" });
    const res = await run("act1");
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
        where: { activityId: "act1" },
        data: expect.objectContaining({
          status: "scheduled",
          attendeeEmails: ["jane@client.com"],
        }),
      })
    );
    expect(res).toEqual({ pushed: true, did: "patch" });
  });

  it("deletes an event on cancel and marks the mapping cancelled", async () => {
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    const res = await run("act1", "cancel");
    expect(events.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        eventId: "gev1",
        sendUpdates: "all",
      })
    );
    expect(updateManyMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activityId: "act1" },
        data: { status: "cancelled" },
      })
    );
    expect(res).toEqual({ pushed: true, did: "delete" });
  });

  it("treats a 404 on delete as success (already gone on Google's side)", async () => {
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    events.delete.mockRejectedValue(Object.assign(new Error("Not Found"), { code: 404 }));
    const res = await run("act1", "cancel");
    expect(res).toEqual({ pushed: true, did: "delete" });
    expect(updateManyMapping).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "cancelled" } })
    );
    expect(updateConnection).not.toHaveBeenCalled();
  });

  it("treats a 410 on delete as success (already gone on Google's side)", async () => {
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    events.delete.mockRejectedValue(Object.assign(new Error("Gone"), { code: 410 }));
    const res = await run("act1", "cancel");
    expect(res).toEqual({ pushed: true, did: "delete" });
  });

  it("records lastSyncError and rethrows on a non-404/410 delete failure", async () => {
    decide.mockReturnValue({ do: "delete", eventId: "gev1" });
    const error = Object.assign(new Error("Server error"), { code: 500 });
    events.delete.mockRejectedValue(error);
    isRevocation.mockReturnValue(false);

    await expect(run("act1", "cancel")).rejects.toThrow("Server error");

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

    await expect(run("act1")).rejects.toThrow("invalid_grant");

    expect(updateConnection).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncError: "invalid_grant", isActive: false },
    });
  });

  it("treats a concurrent duplicate mapping create (P2002) as benign on insert", async () => {
    decide.mockReturnValue({ do: "insert" });
    createMapping.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    const res = await run("act1");
    expect(res).toEqual({ pushed: true, did: "insert" });
    expect(updateConnection).not.toHaveBeenCalled();
  });
});
