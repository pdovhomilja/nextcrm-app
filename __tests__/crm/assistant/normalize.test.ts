// Pure normalization helpers used to match an assistant caller to an existing lead.

import {
  normalizeEmail,
  normalizePhone,
  phoneMatchVariants,
  splitName,
} from "@/lib/crm/assistant/normalize";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toBe("jane.doe@example.com");
  });

  it("returns null for empty / missing input", () => {
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("treats a bare 10-digit number as US (+1)", () => {
    expect(normalizePhone("(913) 555-0142")).toBe("+19135550142");
  });

  it("keeps an 11-digit number that already carries the US country code", () => {
    expect(normalizePhone("1-913-555-0142")).toBe("+19135550142");
  });

  it("keeps an explicit international number as-is", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("rejects too-short and too-long input", () => {
    expect(normalizePhone("555-0142")).toBeNull();
    expect(normalizePhone("+1234567890123456")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe("phoneMatchVariants", () => {
  it("matches US numbers stored with or without the leading 1", () => {
    expect(phoneMatchVariants("+19135550142")).toEqual(["19135550142", "9135550142"]);
  });

  it("returns just the digits for non-US numbers", () => {
    expect(phoneMatchVariants("+442079460958")).toEqual(["442079460958"]);
  });

  it("returns no variants for a null phone", () => {
    expect(phoneMatchVariants(null)).toEqual([]);
  });
});

describe("splitName", () => {
  it("puts the last word in lastName and the rest in firstName", () => {
    expect(splitName("Jane Q  Doe")).toEqual({ firstName: "Jane Q", lastName: "Doe" });
  });

  it("uses a single word as lastName (the required lead field)", () => {
    expect(splitName("Cher")).toEqual({ firstName: undefined, lastName: "Cher" });
  });

  it("falls back to a placeholder lastName when no name was captured", () => {
    expect(splitName(undefined)).toEqual({ firstName: undefined, lastName: "Unknown" });
  });
});
