import { matchIndustry } from "../match-industry";
import { INDUSTRY_PROMPTS } from "../../../../prisma/seeds/homepage-prompt-layers";

const prompts = INDUSTRY_PROMPTS.map((p) => ({ id: p.id, name: p.name }));
const idOf = (startsWith: string) => {
  const p = prompts.find((x) => x.name.startsWith(startsWith));
  if (!p) throw new Error(`no seeded prompt starting with ${startsWith}`);
  return p.id;
};

describe("matchIndustry", () => {
  it.each([
    ["Nail salon", "Salon, spa"],
    ["HVAC", "Home trades"],
    ["Dentist", "Dental"],
    ["Auto repair", "Automotive"],
    ["Law firm (estate)", "Legal"],
    ["Plumber", "Home trades"],
    ["Roofing contractor", "Remodeling"],
    ["Lawn care", "Landscaping"],
    ["Veterinarian", "Veterinary"],
    ["Yoga studio", "Fitness"],
    ["Italian restaurant", "Food & drink"],
    ["Wedding venue", "Events"],
    ["CPA / accounting", "Financial"],
    ["Chiropractor", "Medical"],
    ["Food pantry", "Nonprofit"],
  ])("%s -> %s", (text, promptPrefix) => {
    expect(matchIndustry(text, prompts)).toBe(idOf(promptPrefix));
  });

  it("is case/diacritic/punctuation-insensitive", () => {
    expect(matchIndustry("  CAFÉ & Bakery!! ", prompts)).toBe(idOf("Food & drink"));
  });

  it("does not match keywords inside other words", () => {
    // "student"/"carpet"/"cardigan" must not trigger dental/auto-style matches.
    expect(matchIndustry("Student housing", prompts)).toBeNull();
    expect(matchIndustry("Carpet cleaning", prompts)).toBeNull();
  });

  it("bare collision-prone words no longer mis-route", () => {
    expect(matchIndustry("Bar association", prompts)).toBeNull();
    expect(matchIndustry("Community bank", prompts)).toBeNull();
    expect(matchIndustry("Boarding school", prompts)).toBeNull();
    expect(matchIndustry("Bath & body", prompts)).toBeNull();
  });

  it("returns null for unrecognized, empty, or null input", () => {
    expect(matchIndustry("Quantum cryptography", prompts)).toBeNull();
    expect(matchIndustry("", prompts)).toBeNull();
    expect(matchIndustry("   ", prompts)).toBeNull();
    expect(matchIndustry(null, prompts)).toBeNull();
  });

  it("never returns the Generic prompt and tolerates an empty library", () => {
    expect(matchIndustry("Generic", prompts)).toBeNull();
    expect(matchIndustry("Nail salon", [])).toBeNull();
  });

  it("falls back to name tokens for operator-added/renamed prompts", () => {
    const custom = [{ id: "c-1", name: "Photography studios" }];
    expect(matchIndustry("Wedding photography", custom)).toBe("c-1");
    expect(matchIndustry("Plumber", custom)).toBeNull();
  });

  it("never throws on junk input", () => {
    expect(() => matchIndustry(undefined as unknown as string, prompts)).not.toThrow();
    expect(() => matchIndustry(42 as unknown as string, prompts)).not.toThrow();
    expect(() =>
      matchIndustry("salon", [{ id: "x", name: undefined as unknown as string }]),
    ).not.toThrow();
  });
});
