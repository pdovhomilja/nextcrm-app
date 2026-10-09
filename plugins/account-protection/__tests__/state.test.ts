import { contactTypes, settingsSchema } from "../settings";
import { dueDay, evaluate, formatDay, isoDay, newRegistration, summarize } from "../state";

const S = settingsSchema.parse({});
const at = new Date("2026-10-01T14:00:00Z");

it("has the documented defaults", () => {
  expect(S).toEqual({ protectionDays: 90, contactDays: 30, contactTypes: "visit,meeting", warnDays: 7, defaultCountry: "CZ", requireNumber: false });
});

it("parses contact types and ignores unknown names", () => {
  expect(contactTypes(" visit, meeting ,sample,,call ")).toEqual(["visit", "meeting", "call"]);
});

it("rejects contact types with no valid type and falls back to the default when one is stored", () => {
  expect(settingsSchema.safeParse({ contactTypes: "sample, visits" }).success).toBe(false);
  expect(settingsSchema.safeParse({ contactTypes: "" }).success).toBe(false);
  expect(settingsSchema.safeParse({ contactTypes: "call" }).success).toBe(true);
  expect(contactTypes("sample, visits")).toEqual(["visit", "meeting"]);
  expect(contactTypes("")).toEqual(["visit", "meeting"]);
});

it("computes windows and the first due day", () => {
  const r = newRegistration("CZ:1", "u1", at, S);
  expect(r).toEqual({ key: "CZ:1", ownerId: "u1", registeredAt: "2026-10-01T14:00:00.000Z",
    contactDeadline: "2026-10-31T14:00:00.000Z", protectedUntil: "2026-12-30T14:00:00.000Z" });
  expect(dueDay(r)).toBe("2026-10-31");
  expect(dueDay({ ...r, contactAt: "2026-10-10T09:00:00.000Z" })).toBe("2026-12-30");
});

it("clamps the contact deadline to the protection window", () => {
  const r = newRegistration("CZ:1", "u1", at, { protectionDays: 10, contactDays: 30 });
  expect(r.contactDeadline).toBe(r.protectedUntil);
});

it("does not expire before the exact deadline time (Review Focus 4)", () => {
  const r = newRegistration("CZ:1", "u1", at, S);
  expect(evaluate(r, new Date("2026-10-31T06:00:00Z"))).toBe("keep");
  expect(evaluate(r, new Date("2026-11-01T06:00:00Z"))).toBe("check-contact");
  expect(evaluate({ ...r, contactAt: "2026-10-05T00:00:00Z" }, new Date("2026-11-01T06:00:00Z"))).toBe("keep");
  expect(evaluate({ ...r, contactAt: "2026-10-05T00:00:00Z" }, new Date("2026-12-31T06:00:00Z"))).toBe("expired");
});

it("summarizes for the panel", () => {
  const r = newRegistration("CZ:1", "u1", at, S);
  expect(summarize(false, null, null)).toEqual({ kind: "noNumber" });
  expect(summarize(true, null, null)).toEqual({ kind: "free" });
  expect(summarize(true, r, null)).toEqual({ kind: "contactNeeded", date: r.contactDeadline });
  expect(summarize(true, r, "2026-10-05T00:00:00Z")).toEqual({ kind: "protected", date: r.protectedUntil });
});

it("formats days in UTC per locale", () => {
  expect(isoDay("2026-12-30T23:30:00.000Z")).toBe("2026-12-30");
  expect(formatDay("2027-01-12T23:30:00.000Z", "en")).toBe("12 Jan 2027");
  expect(formatDay("2027-01-12T23:30:00.000Z", "cz")).toBe("12. 1. 2027");
});
