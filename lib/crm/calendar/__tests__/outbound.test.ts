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

// decideOutboundAction now refuses to push a meeting whose date has already
// passed (see the "in-the-past" skip), so the shared fixture has to stay in
// the future for the life of the test suite rather than a few days past the
// day it was written.
const MEETING = {
  type: "meeting",
  date: new Date("2099-07-25T10:00:00Z"),
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

  describe("already-happened meetings are never re-pushed", () => {
    const GOOGLE_MAPPING = { source: "google", externalId: "ev1", status: "scheduled" };

    it("skips a completed meeting instead of patching it (logging an outcome must not email the customer)", () => {
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: { ...MEETING, status: "completed" },
          mapping: GOOGLE_MAPPING,
          hasWriteConnection: true,
        })
      ).toEqual({ do: "skip", reason: "already-completed" });
    });

    it("skips a completed meeting that was never pushed instead of inserting it", () => {
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: { ...MEETING, status: "completed" },
          mapping: null,
          hasWriteConnection: true,
        })
      ).toEqual({ do: "skip", reason: "already-completed" });
    });

    it("still skips a completed meeting with a live mapping and a past date (the notes-after-the-fact case)", () => {
      // The `already-completed` skip runs BEFORE any mapping/date branching,
      // so narrowing the past-date skip to unmapped meetings cannot reopen the
      // case that skip was written for.
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: {
            ...MEETING,
            status: "completed",
            date: new Date("2026-07-19T10:00:00Z"),
          },
          mapping: GOOGLE_MAPPING,
          hasWriteConnection: true,
          now: new Date("2026-07-20T09:00:00Z"),
        })
      ).toEqual({ do: "skip", reason: "already-completed" });
    });

    it("skips inserting a never-pushed meeting whose date is in the past", () => {
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: { ...MEETING, date: new Date("2026-07-19T10:00:00Z") },
          mapping: null,
          hasWriteConnection: true,
          now: new Date("2026-07-20T09:00:00Z"),
        })
      ).toEqual({ do: "skip", reason: "in-the-past" });
    });

    it("skips a past-dated meeting whose only mapping is cancelled history (nothing live to keep in sync)", () => {
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: { ...MEETING, date: new Date("2026-07-19T10:00:00Z") },
          mapping: { ...GOOGLE_MAPPING, status: "cancelled" },
          hasWriteConnection: true,
          now: new Date("2026-07-20T09:00:00Z"),
        })
      ).toEqual({ do: "skip", reason: "in-the-past" });
    });

    it("still PATCHES a live mapping when the meeting is genuinely back-dated into the past", () => {
      // The customer is already holding an invite for the old (future) date
      // recorded in mapping.startAt. Skipping here would strand that invite:
      // Google would keep advertising Aug 1 for a meeting the CRM now says
      // was Jul 15. The date MOVED, so this is a real reschedule.
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: { ...MEETING, date: new Date("2026-07-15T10:00:00Z") },
          mapping: { ...GOOGLE_MAPPING, startAt: new Date("2026-08-01T10:00:00Z") },
          hasWriteConnection: true,
          now: new Date("2026-07-20T09:00:00Z"),
        })
      ).toEqual({ do: "patch", eventId: "ev1" });
    });

    it("skips a non-date edit on a past meeting with a live mapping (rep logging debrief notes)", () => {
      // The meeting happened on Jul 15 and the rep never touched the Status
      // dropdown, so it is still "scheduled" — `already-completed` cannot
      // catch this. On Jul 20 they type notes into the form's Notes field,
      // which submits `description` (and `title`) into a real patch body.
      // mapping.startAt still equals activity.date: the date did NOT move, so
      // this is not a reschedule and Google must not mail the customer an
      // "Updated invitation" for a meeting five days gone.
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: { ...MEETING, status: "scheduled", date: new Date("2026-07-15T10:00:00Z") },
          mapping: { ...GOOGLE_MAPPING, startAt: new Date("2026-07-15T10:00:00Z") },
          hasWriteConnection: true,
          now: new Date("2026-07-20T09:00:00Z"),
        })
      ).toEqual({ do: "skip", reason: "in-the-past" });
    });

    it("still patches a meeting that is only just in the future", () => {
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: { ...MEETING, date: new Date("2026-07-20T10:00:00Z") },
          mapping: GOOGLE_MAPPING,
          hasWriteConnection: true,
          now: new Date("2026-07-20T09:00:00Z"),
        })
      ).toEqual({ do: "patch", eventId: "ev1" });
    });

    it("still cancels a past or completed meeting (teardown must not be blocked)", () => {
      expect(
        decideOutboundAction({
          action: "cancel",
          activity: { ...MEETING, status: "completed", date: new Date("2026-07-19T10:00:00Z") },
          mapping: GOOGLE_MAPPING,
          hasWriteConnection: true,
          now: new Date("2026-07-20T09:00:00Z"),
        })
      ).toEqual({ do: "delete", eventId: "ev1" });
    });
  });

  describe("organizer guard", () => {
    it("skips patching a meeting organized by the customer (403 forbiddenForNonOrganizer)", () => {
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: MEETING,
          mapping: {
            source: "google",
            externalId: "ev1",
            status: "scheduled",
            rawPayload: { organizer: { email: "jane@client.com" } },
          },
          hasWriteConnection: true,
        })
      ).toEqual({ do: "skip", reason: "not-organizer" });
    });

    it("patches a meeting the rep organizes (organizer.self === true)", () => {
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: MEETING,
          mapping: {
            source: "google",
            externalId: "ev1",
            status: "scheduled",
            rawPayload: { organizer: { email: "rep@acme.com", self: true } },
          },
          hasWriteConnection: true,
        })
      ).toEqual({ do: "patch", eventId: "ev1" });
    });

    it("treats an absent organizer as unknown and keeps patching (no regression for existing mappings)", () => {
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: MEETING,
          mapping: { source: "google", externalId: "ev1", status: "scheduled", rawPayload: {} },
          hasWriteConnection: true,
        })
      ).toEqual({ do: "patch", eventId: "ev1" });
      expect(
        decideOutboundAction({
          action: "upsert",
          activity: MEETING,
          mapping: { source: "google", externalId: "ev1", status: "scheduled", rawPayload: null },
          hasWriteConnection: true,
        })
      ).toEqual({ do: "patch", eventId: "ev1" });
    });

    it("still cancels a customer-organized meeting (delete removes our own copy)", () => {
      expect(
        decideOutboundAction({
          action: "cancel",
          activity: MEETING,
          mapping: {
            source: "google",
            externalId: "ev1",
            status: "scheduled",
            rawPayload: { organizer: { email: "jane@client.com" } },
          },
          hasWriteConnection: true,
        })
      ).toEqual({ do: "delete", eventId: "ev1" });
    });
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
