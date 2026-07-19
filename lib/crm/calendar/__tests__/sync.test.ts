// lib/crm/calendar/__tests__/sync.test.ts
jest.mock("@/lib/prisma", () => {
  const mock: Record<string, unknown> = {
    crm_CalendarEvents: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    crm_Activities: { create: jest.fn(), update: jest.fn() },
    crm_Targets: { create: jest.fn() },
    users: { findFirst: jest.fn() },
  };
  mock.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(mock));
  return { prismadb: mock };
});
jest.mock("../match", () => ({ matchCounterparty: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { matchCounterparty } from "../match";
import { upsertCalendarEvent } from "../sync";
import type { CalendarEventInput } from "../types";

const mapping = prismadb.crm_CalendarEvents;
const findUnique = mapping.findUnique as jest.Mock;
const findMany = mapping.findMany as jest.Mock;
const createMapping = mapping.create as jest.Mock;
const updateMapping = mapping.update as jest.Mock;
const createActivity = prismadb.crm_Activities.create as jest.Mock;
const updateActivity = prismadb.crm_Activities.update as jest.Mock;
const createTarget = prismadb.crm_Targets.create as jest.Mock;
const findUser = prismadb.users.findFirst as jest.Mock;
const match = matchCounterparty as jest.Mock;
const transaction = prismadb.$transaction as jest.Mock;

function input(overrides: Partial<CalendarEventInput> = {}): CalendarEventInput {
  return {
    source: "calendly",
    externalId: "https://api.calendly.com/scheduled_events/EV1/invitees/INV1",
    title: "Intro call",
    startAt: new Date("2026-07-21T10:00:00Z"),
    endAt: new Date("2026-07-21T10:30:00Z"),
    counterpartyEmails: ["jane@client.com"],
    hostEmail: "rep@aqunama.com",
    status: "scheduled",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  findUnique.mockResolvedValue(null);
  findMany.mockResolvedValue([]);
  findUser.mockResolvedValue(null);
  createActivity.mockResolvedValue({ id: "act1" });
  createMapping.mockResolvedValue({ id: "map1" });
});

describe("upsertCalendarEvent", () => {
  it("creates activity + mapping for a matched event", async () => {
    match.mockResolvedValue([{ entityType: "contact", entityId: "c1" }]);
    const res = await upsertCalendarEvent(input());
    expect(res).toEqual({ action: "created", activityId: "act1" });
    expect(createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "meeting",
          status: "scheduled",
          duration: 30,
          links: { create: [{ entityType: "contact", entityId: "c1" }] },
        }),
      })
    );
    expect(createMapping).toHaveBeenCalled();
  });

  it("cancels an existing mapping + activity", async () => {
    findUnique.mockResolvedValue({
      id: "map1", activityId: "act1", status: "scheduled",
      startAt: new Date("2026-07-21T10:00:00Z"),
    });
    const res = await upsertCalendarEvent(input({ status: "cancelled" }));
    expect(res.action).toBe("cancelled");
    expect(updateActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "act1" },
        data: expect.objectContaining({ status: "cancelled" }),
      })
    );
    expect(updateMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "cancelled" }),
      })
    );
  });

  it("updates activity date on reschedule", async () => {
    findUnique.mockResolvedValue({
      id: "map1", activityId: "act1", status: "scheduled",
      startAt: new Date("2026-07-21T10:00:00Z"),
    });
    const res = await upsertCalendarEvent(
      input({ startAt: new Date("2026-07-22T09:00:00Z") })
    );
    expect(res.action).toBe("updated");
    expect(updateActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ date: new Date("2026-07-22T09:00:00Z") }),
      })
    );
    expect(updateMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startAt: new Date("2026-07-22T09:00:00Z") }),
      })
    );
  });

  it("skips unchanged existing events", async () => {
    findUnique.mockResolvedValue({
      id: "map1", activityId: "act1", status: "scheduled",
      startAt: new Date("2026-07-21T10:00:00Z"),
    });
    const res = await upsertCalendarEvent(input());
    expect(res).toEqual({ action: "skipped", reason: "unchanged" });
  });

  it("skips a cancel for an unknown event", async () => {
    const res = await upsertCalendarEvent(input({ status: "cancelled" }));
    expect(res).toEqual({ action: "skipped", reason: "cancel-for-unknown" });
  });

  it("skips a google event that duplicates a calendly booking", async () => {
    findMany.mockResolvedValue([
      { attendeeEmails: ["jane@client.com"] },
    ]);
    const res = await upsertCalendarEvent(
      input({ source: "google", externalId: "gev1", connectionId: "conn1" })
    );
    expect(res).toEqual({ action: "skipped", reason: "duplicate-of-calendly" });
    expect(createActivity).not.toHaveBeenCalled();
  });

  it("skips unmatched google events", async () => {
    match.mockResolvedValue([]);
    const res = await upsertCalendarEvent(
      input({ source: "google", externalId: "gev1", connectionId: "conn1" })
    );
    expect(res).toEqual({ action: "skipped", reason: "no-match" });
    expect(createTarget).not.toHaveBeenCalled();
  });

  it("creates a Target for unmatched calendly invitees, assigned to the host rep", async () => {
    match.mockResolvedValue([]);
    findUser.mockResolvedValue({ id: "rep1" });
    createTarget.mockResolvedValue({ id: "t-new" });
    const res = await upsertCalendarEvent(
      input({ rawPayload: { payload: { name: "Jane Doe" } } })
    );
    expect(res.action).toBe("created");
    expect(createTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          first_name: "Jane",
          last_name: "Doe",
          email: "jane@client.com",
          tags: ["book-a-call"],
          created_by: "rep1",
        }),
      })
    );
    expect(createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          links: { create: [{ entityType: "target", entityId: "t-new" }] },
        }),
      })
    );
  });

  it("treats a concurrent duplicate-create race as benign (P2002)", async () => {
    match.mockResolvedValue([{ entityType: "contact", entityId: "c1" }]);
    transaction.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }));
    const res = await upsertCalendarEvent(input());
    expect(res).toEqual({ action: "skipped", reason: "concurrent-duplicate" });
  });
});
