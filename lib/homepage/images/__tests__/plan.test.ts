import { planHomepageImages } from "@/lib/homepage/images/plan";

describe("planHomepageImages", () => {
  it("count 0 -> no specs", () => {
    expect(planHomepageImages({ count: 0, industry: "Salon", company: "X", description: null, colors: [] })).toEqual([]);
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

  it("caps count at MAX via spec roles (hero always first)", () => {
    const specs = planHomepageImages({ count: 6, industry: null, company: null, description: null, colors: [] });
    expect(specs[0].role).toBe("hero");
    expect(specs.filter((s) => s.role === "section")).toHaveLength(5);
  });
});
