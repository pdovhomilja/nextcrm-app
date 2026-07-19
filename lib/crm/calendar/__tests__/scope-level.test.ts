import { scopeLevelFromGrantedScopes } from "../google";

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
