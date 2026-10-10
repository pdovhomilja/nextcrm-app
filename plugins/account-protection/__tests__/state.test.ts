import { contactTypes, settingsSchema } from "../settings";
import { addMonthsUtc, dueDay, evaluate, formatDay, isoDay, newRegistration, summarize, withOrders } from "../state";

const S = settingsSchema.parse({});
const at = new Date("2026-10-01T14:00:00Z");

it("has the documented defaults", () => {
  expect(S).toEqual({ protectionDays: 90, contactDays: 30, contactTypes: "visit,meeting", warnDays: 7, defaultCountry: "CZ", requireNumber: false, orderMonths: 12 });
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
    contactDeadline: "2026-10-31T14:00:00.000Z", protectedUntil: "2026-12-30T14:00:00.000Z", baseUntil: "2026-12-30T14:00:00.000Z" });
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

describe("orders (rule 3)", () => {
  const S12 = settingsSchema.parse({});
  const reg = newRegistration("CZ:1", "rep1", new Date("2026-10-01T14:00:00Z"), S12);

  it("defaults orderMonths to 12 and accepts 0", () => {
    expect(S12.orderMonths).toBe(12);
    expect(settingsSchema.parse({ orderMonths: 0 }).orderMonths).toBe(0);
    expect(() => settingsSchema.parse({ orderMonths: -1 })).toThrow();
  });

  it("stores the registration's own window as baseUntil", () => {
    expect(reg.baseUntil).toBe(reg.protectedUntil);
  });

  it("adds calendar months in UTC, clamping month ends (Review Focus 2)", () => {
    expect(addMonthsUtc("2026-01-31", 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(addMonthsUtc("2028-02-29", 12).toISOString()).toBe("2029-02-28T00:00:00.000Z");
    expect(addMonthsUtc("2026-10-13", 12).toISOString()).toBe("2027-10-13T00:00:00.000Z");
  });

  it("extends to the last order + months, never below the own window", () => {
    const a = withOrders(reg, "2026-10-10", 12);
    expect([a.protectedUntil, a.lastOrderAt, a.baseUntil]).toEqual(["2027-10-10T00:00:00.000Z", "2026-10-10", reg.protectedUntil]);
    expect(withOrders(reg, "2025-01-01", 12).protectedUntil).toBe(reg.protectedUntil);
    expect(withOrders(reg, "2026-10-10", 0).protectedUntil).toBe(reg.protectedUntil);
    const back = withOrders(a, null, 12);
    expect([back.protectedUntil, back.lastOrderAt]).toEqual([reg.protectedUntil, undefined]);
  });

  it("counts an order as contact from the registration day, or when it still protects (Pavel 2026-10-10)", () => {
    expect(withOrders(reg, "2025-01-01", 12).contactAt).toBeUndefined();   // too old to extend protection
    expect(withOrders(reg, "2026-09-30", 0).contactAt).toBeUndefined();    // rule 3 off: only orders since registration count
    expect(withOrders(reg, "2026-09-30", 12).contactAt).toBe("2026-09-30T00:00:00.000Z");   // recent order before registration waives contact
    expect(withOrders(reg, "2026-10-01", 12).contactAt).toBe("2026-10-01T00:00:00.000Z");
    expect(withOrders({ ...reg, contactAt: "2026-10-05T09:00:00.000Z" }, "2026-10-20", 12).contactAt).toBe("2026-10-05T09:00:00.000Z");
  });

  it("reads 0.1.x registrations without baseUntil and is idempotent", () => {
    const { baseUntil, ...old } = reg;
    const once = withOrders(old as typeof reg, "2026-10-10", 12);
    expect(once.baseUntil).toBe(baseUntil);
    expect(JSON.stringify(withOrders(once, "2026-10-10", 12))).toBe(JSON.stringify(once));
  });
});
