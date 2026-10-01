import { planHomepageImages } from "@/lib/homepage/images/plan";

describe("planHomepageImages", () => {
  it("count 0 -> no specs", () => {
    expect(planHomepageImages({ count: 0, industry: "Salon", company: "X", description: null, colors: [] })).toEqual([]);
  });

  it("count 1 -> hero only with 16:9 aspect", () => {
    const specs = planHomepageImages({ count: 1, industry: "Salon", company: "X", description: null, colors: [] });
    expect(specs).toHaveLength(1);
    expect(specs[0].role).toBe("hero");
    expect(specs[0].aspectRatio).toBe("16:9");
    expect(specs[0].token).toBe("__RADE_IMG_1__");
  });

  it("count 3 -> hero + 2 sections with unique tokens and bounded prompt", () => {
    const specs = planHomepageImages({ count: 3, industry: "Salon / spa", company: "Salon De Crist", description: "downtown salon", colors: ["#3a2130", "#b98a4e"] });
    expect(specs).toHaveLength(3);
    expect(specs[0].role).toBe("hero");
    expect(specs[0].aspectRatio).toBe("16:9");
    expect(specs.map((s) => s.token)).toEqual(["__RADE_IMG_1__", "__RADE_IMG_2__", "__RADE_IMG_3__"]);
    expect(specs[1].aspectRatio).toBe("4:5");
    // palette + industry steer the prompt; every spec has alt text
    expect(specs[0].prompt).toContain("Salon / spa");
    expect(specs[0].prompt).toContain("#3a2130");
    expect(specs.every((s) => s.alt.length > 0)).toBe(true);
    // bounded: no raw giant description injected
    expect(specs[0].prompt.length).toBeLessThan(600);
  });

  it("hero first, remaining are sections", () => {
    const specs = planHomepageImages({ count: 6, industry: null, company: null, description: null, colors: [] });
    expect(specs[0].role).toBe("hero");
    expect(specs.filter((s) => s.role === "section")).toHaveLength(5);
  });

  it("security: adversarial input (injection attempt via description, industry, colors)", () => {
    // Adversarial inputs designed to break bounds and injection guards if they weren't in place.
    // Focus: invalid colors should be filtered, and the final prompt should never exceed 600 chars.

    const specs = planHomepageImages({
      count: 3,
      industry: "salon" + "y".repeat(500), // Large industry field.
      company: null,
      description: "downtown salon. " + "x".repeat(5000), // Large description field.
      colors: [
        "#3a2130", // Valid hex (control).
        "#fff. " + "z".repeat(5000), // Invalid: contains non-hex content.
        "not-a-hex-color-at-all",
        "123456", // Invalid: missing #.
      ],
    });

    expect(specs).toHaveLength(3);

    // Core security property: every spec's prompt ≤ 600 chars (hard backstop).
    // This prevents any field combination from producing oversized prompts.
    specs.forEach((spec) => {
      expect(spec.prompt.length).toBeLessThanOrEqual(600);
    });

    // Verify only valid hex colors are in the palette.
    // Invalid colors (with or without injection markers) must be filtered out.
    expect(specs[0].prompt).toContain("#3a2130"); // Valid hex present.
    // Invalid color entries should not appear.
    expect(specs[0].prompt).not.toContain("z".repeat(100)); // Color padding filtered.
    expect(specs[0].prompt).not.toContain("not-a-hex");
    expect(specs[0].prompt).not.toContain("123456");
  });

  it("non-finite count guards (Infinity, NaN, negative)", () => {
    // Infinity should return empty (treated as non-finite).
    const infinitySpecs = planHomepageImages({ count: Infinity, industry: null, company: null, description: null, colors: [] });
    expect(infinitySpecs).toEqual([]);

    // NaN should also return empty.
    const nanSpecs = planHomepageImages({ count: NaN, industry: null, company: null, description: null, colors: [] });
    expect(nanSpecs).toEqual([]);

    // Negative should be treated as 0.
    const negSpecs = planHomepageImages({ count: -5, industry: null, company: null, description: null, colors: [] });
    expect(negSpecs).toEqual([]);
  });
});
