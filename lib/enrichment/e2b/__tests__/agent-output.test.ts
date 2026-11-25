import { parseAgentOutput } from "../agent-output";

const contact = (i: number) => ({ name: `Person ${i}`, email: null, title: "CEO", linkedinUrl: `https://www.linkedin.com/in/p${i}`, phone: null, source: "enriched" });

describe("parseAgentOutput", () => {
  it("keeps a well-formed result", () => {
    const out = parseAgentOutput(JSON.stringify({
      target: { company_website: "https://acme.example", industry: "Tools", city: null },
      contacts: [contact(1)],
      confidence: { industry: 0.9 },
    }));
    expect(out).toEqual({
      target: { company_website: "https://acme.example", industry: "Tools", city: null },
      contacts: [contact(1)],
      confidence: { industry: 0.9 },
    });
  });

  it("keeps at most 10 contacts", () => {
    const out = parseAgentOutput(JSON.stringify({ target: {}, contacts: Array.from({ length: 25 }, (_, i) => contact(i)), confidence: {} }));
    expect(out.contacts).toHaveLength(10);
    expect(out.contacts[0].name).toBe("Person 0");
  });

  it("drops link fields that are not https URLs", () => {
    const out = parseAgentOutput(JSON.stringify({
      target: { company_website: "http://acme.example", social_linkedin: "javascript:alert(1)", social_x: "https://x.com/acme" },
      contacts: [{ ...contact(1), linkedinUrl: "data:text/html,hi" }],
      confidence: {},
    }));
    expect(out.target).toEqual({ company_website: null, social_linkedin: null, social_x: "https://x.com/acme" });
    expect(out.contacts[0].linkedinUrl).toBeNull();
  });

  it("drops strings over 500 characters, wrong types and unknown fields", () => {
    const out = parseAgentOutput(JSON.stringify({
      target: { description: "d".repeat(501), industry: 42, owner: "someone" },
      contacts: [{ ...contact(1), title: "t".repeat(501), email: "not-an-email", extra: 1 }],
      confidence: { industry: "high", city: 0.8 },
    }));
    expect(out.target).toEqual({ description: null, industry: null });
    expect(out.contacts[0]).toEqual({ ...contact(1), title: null, email: null });
    expect(out.confidence).toEqual({ city: 0.8 });
  });

  it("treats missing parts as empty", () => {
    expect(parseAgentOutput("{}")).toEqual({ target: {}, contacts: [], confidence: {} });
  });

  it("refuses output that is not a JSON object", () => {
    expect(() => parseAgentOutput("not json")).toThrow();
    expect(() => parseAgentOutput("[1,2]")).toThrow();
  });
});
