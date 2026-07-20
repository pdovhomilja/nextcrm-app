jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
    crm_Leads: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  decideOutboundAction,
  buildOutboundEvent,
  resolveCounterpartyEmail,
} from "../outbound";

const contacts = prismadb.crm_Contacts.findFirst as jest.Mock;
const targets = prismadb.crm_Targets.findFirst as jest.Mock;
const leads = prismadb.crm_Leads.findFirst as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const MEETING = {
  type: "meeting",
  date: new Date("2026-07-25T10:00:00Z"),
  status: "scheduled",
  deletedAt: null,
};

describe("decideOutboundAction", () => {
  it("skips missing / non-meeting / calendly-owned / no-write-connection", () => {
    expect(
      decideOutboundAction({ action: "upsert", activity: null, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "not-found" });
    expect(
      decideOutboundAction({ action: "upsert", activity: { ...MEETING, type: "call" }, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "not-a-meeting" });
    expect(
      decideOutboundAction({ action: "upsert", activity: MEETING, mapping: { source: "calendly", externalId: "x", status: "scheduled" }, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "calendly-owned" });
    expect(
      decideOutboundAction({ action: "upsert", activity: MEETING, mapping: null, hasWriteConnection: false })
    ).toEqual({ do: "skip", reason: "no-write-connection" });
  });

  it("inserts new meetings, patches mapped ones", () => {
    expect(
      decideOutboundAction({ action: "upsert", activity: MEETING, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "insert" });
    expect(
      decideOutboundAction({ action: "upsert", activity: MEETING, mapping: { source: "google", externalId: "ev1", status: "scheduled" }, hasWriteConnection: true })
    ).toEqual({ do: "patch", eventId: "ev1" });
  });

  it("cancel deletes when mapped to google, skips when never pushed", () => {
    expect(
      decideOutboundAction({ action: "cancel", activity: MEETING, mapping: { source: "google", externalId: "ev1", status: "scheduled" }, hasWriteConnection: true })
    ).toEqual({ do: "delete", eventId: "ev1" });
    expect(
      decideOutboundAction({ action: "cancel", activity: MEETING, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "never-pushed" });
  });

  it("treats cancelled/deleted upserts as cancels", () => {
    expect(
      decideOutboundAction({
        action: "upsert",
        activity: { ...MEETING, status: "cancelled" },
        mapping: { source: "google", externalId: "ev1", status: "scheduled" },
        hasWriteConnection: true,
      })
    ).toEqual({ do: "delete", eventId: "ev1" });
    expect(
      decideOutboundAction({
        action: "upsert",
        activity: { ...MEETING, deletedAt: new Date() },
        mapping: null,
        hasWriteConnection: true,
      })
    ).toEqual({ do: "skip", reason: "never-pushed" });
  });

  it("treats an upsert against a cancelled mapping as a fresh insert (reschedule after cancellation)", () => {
    // The delete branch in outbound-sync.ts leaves the mapping row as history
    // with status "cancelled" rather than deleting it — that row no longer
    // points at a live Google event, so patching it would 404.
    expect(
      decideOutboundAction({
        action: "upsert",
        activity: MEETING,
        mapping: { source: "google", externalId: "ev1", status: "cancelled" },
        hasWriteConnection: true,
      })
    ).toEqual({ do: "insert" });
  });

  it("still patches a mapping that remains scheduled", () => {
    expect(
      decideOutboundAction({
        action: "upsert",
        activity: MEETING,
        mapping: { source: "google", externalId: "ev1", status: "scheduled" },
        hasWriteConnection: true,
      })
    ).toEqual({ do: "patch", eventId: "ev1" });
  });

  it("skips upserts without a date", () => {
    expect(
      decideOutboundAction({ action: "upsert", activity: { ...MEETING, date: null }, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "no-date" });
  });
});

describe("buildOutboundEvent", () => {
  it("builds a timed event with attendee and 30-min default duration", () => {
    const ev = buildOutboundEvent(
      { title: "Demo call", description: "Agenda", date: new Date("2026-07-25T10:00:00Z"), duration: null },
      "jane@client.com"
    );
    expect(ev).toEqual({
      summary: "Demo call",
      description: "Agenda",
      start: { dateTime: "2026-07-25T10:00:00.000Z" },
      end: { dateTime: "2026-07-25T10:30:00.000Z" },
      attendees: [{ email: "jane@client.com" }],
    });
  });

  it("omits attendees for private blocks and uses real duration", () => {
    const ev = buildOutboundEvent(
      { title: "Prep", description: null, date: new Date("2026-07-25T10:00:00Z"), duration: 45 },
      null
    );
    expect(ev.attendees).toBeUndefined();
    expect(ev.end).toEqual({ dateTime: "2026-07-25T10:45:00.000Z" });
  });
});

describe("resolveCounterpartyEmail", () => {
  it("prefers contact over target over lead, first link with an email wins", async () => {
    contacts.mockResolvedValue({ email: "Jane@Client.com" });
    const email = await resolveCounterpartyEmail([
      { entityType: "contact", entityId: "c1" },
      { entityType: "target", entityId: "t1" },
    ]);
    expect(email).toBe("jane@client.com");
    expect(targets).not.toHaveBeenCalled();
  });

  it("falls through link types and returns null when nothing has an email", async () => {
    targets.mockResolvedValue(null);
    leads.mockResolvedValue(null);
    expect(
      await resolveCounterpartyEmail([
        { entityType: "target", entityId: "t1" },
        { entityType: "lead", entityId: "l1" },
        { entityType: "opportunity", entityId: "o1" },
      ])
    ).toBeNull();
  });
});
