import { compareVersions, parseVersion, satisfiesSdkRange, SDK_VERSION } from "../src/version";

describe("version helpers", () => {
  it("parses semver", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(() => parseVersion("1.2")).toThrow("Invalid version");
  });
  it("compares versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.10.0", "1.9.9")).toBe(1);
    expect(compareVersions("0.1.0", "0.2.0")).toBe(-1);
  });
  it("checks caret ranges like npm", () => {
    expect(SDK_VERSION).toBe("0.1.0");
    expect(satisfiesSdkRange("^0.1.0", "0.1.5")).toBe(true);
    expect(satisfiesSdkRange("^0.1.0", "0.2.0")).toBe(false);   // 0.x: minor is breaking
    expect(satisfiesSdkRange("^1.2.0", "1.9.0")).toBe(true);
    expect(satisfiesSdkRange("^1.2.0", "1.1.9")).toBe(false);
    expect(satisfiesSdkRange("^1.2.0", "2.0.0")).toBe(false);
    expect(satisfiesSdkRange(">=0.1.0", "0.1.0")).toBe(false);  // only caret supported
  });
});
