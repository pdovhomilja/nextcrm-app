import { scopeLevelFromGrantedScopes, scopeLevelUpsertFields } from "../google";

describe("scopeLevelFromGrantedScopes", () => {
  it("returns readwrite when calendar.events was granted", () => {
    expect(
      scopeLevelFromGrantedScopes(
        "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events"
      )
    ).toBe("readwrite");
  });

  it("returns readonly for readonly-only grants", () => {
    expect(
      scopeLevelFromGrantedScopes("https://www.googleapis.com/auth/calendar.readonly")
    ).toBe("readonly");
  });

  it("returns readonly for missing scope string", () => {
    expect(scopeLevelFromGrantedScopes(undefined)).toBe("readonly");
    expect(scopeLevelFromGrantedScopes(null)).toBe("readonly");
    expect(scopeLevelFromGrantedScopes("")).toBe("readonly");
  });
});

describe("scopeLevelUpsertFields", () => {
  // The plain "Connect Google Calendar" button requests readonly. Writing the
  // granted level unconditionally on re-auth would silently downgrade a rep
  // who had already enabled two-way sync, stopping outbound push with nothing
  // but an "Inbound only" label as the signal.
  it("omits scopeLevel for a readonly grant so an existing readwrite row is never downgraded", () => {
    expect(scopeLevelUpsertFields("readonly")).toEqual({});
    expect(Object.keys(scopeLevelUpsertFields("readonly"))).toHaveLength(0);
  });

  it("writes scopeLevel for a readwrite grant so the upgrade flow still applies", () => {
    expect(scopeLevelUpsertFields("readwrite")).toEqual({ scopeLevel: "readwrite" });
  });
});
