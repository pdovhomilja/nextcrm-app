import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";

describe("isFieldEmpty", () => {
  it("returns true for null", () => {
    expect(isFieldEmpty(null)).toBe(true);
  });
  it("returns true for empty string", () => {
    expect(isFieldEmpty("")).toBe(true);
  });
  it("returns true for whitespace-only string", () => {
    expect(isFieldEmpty("   ")).toBe(true);
  });
  it("returns false for a real value", () => {
    expect(isFieldEmpty("Developer Tools")).toBe(false);
  });
  it("returns false for a string with spaces around real content", () => {
    expect(isFieldEmpty("  real value  ")).toBe(false);
  });
});
