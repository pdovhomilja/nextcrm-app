import { normalizeGoogleEvent } from "../google-normalize";

const OPTS = { connectionId: "conn1", accountEmail: "rep@aqunama.com" };

function ev(overrides: object = {}) {
  return {
    id: "gev1",
    iCalUID: "uid1@google.com",
    status: "confirmed",
    summary: "Client sync",
    start: { dateTime: "2026-07-21T10:00:00+02:00" },
    end: { dateTime: "2026-07-21T10:30:00+02:00" },
    attendees: [
      { email: "rep@aqunama.com", self: true, responseStatus: "accepted" },
      { email: "jane@client.com", responseStatus: "accepted" },
    ],
    ...overrides,
  };
}

describe("normalizeGoogleEvent", () => {
  it("normalizes a client meeting", () => {
    const res = normalizeGoogleEvent(ev(), OPTS);
    expect(res).toMatchObject({
      source: "google",
      externalId: "gev1",
      iCalUID: "uid1@google.com",
      connectionId: "conn1",
      title: "Client sync",
      counterpartyEmails: ["jane@client.com"],
      hostEmail: "rep@aqunama.com",
      status: "scheduled",
    });
    expect((res as { startAt: Date }).startAt.toISOString()).toBe("2026-07-21T08:00:00.000Z");
  });

  it("skips all-day events", () => {
    expect(normalizeGoogleEvent(ev({ start: { date: "2026-07-21" }, end: { date: "2026-07-22" } }), OPTS))
      .toEqual({ skip: "all-day" });
  });

  it("skips events the rep declined", () => {
    const declined = ev({
      attendees: [
        { email: "rep@aqunama.com", self: true, responseStatus: "declined" },
        { email: "jane@client.com" },
      ],
    });
    expect(normalizeGoogleEvent(declined, OPTS)).toEqual({ skip: "declined" });
  });

  it("skips internal meetings (same-domain attendees only)", () => {
    const internal = ev({
      attendees: [
        { email: "rep@aqunama.com", self: true },
        { email: "colleague@aqunama.com" },
      ],
    });
    expect(normalizeGoogleEvent(internal, OPTS)).toEqual({ skip: "no-counterparty" });
  });

  it("skips events without attendees", () => {
    expect(normalizeGoogleEvent(ev({ attendees: undefined }), OPTS))
      .toEqual({ skip: "no-counterparty" });
  });

  it("maps cancelled events to a cancelled input", () => {
    const res = normalizeGoogleEvent(
      { id: "gev1", status: "cancelled" }, OPTS
    );
    expect(res).toMatchObject({ source: "google", externalId: "gev1", status: "cancelled" });
  });
});
