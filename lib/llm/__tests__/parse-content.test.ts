import { extractJsonCandidate, parseCampaignEmailJson, parseJsonObject } from "@/lib/llm/parse-content";

describe("parseJsonObject", () => {
  it("parses JSON wrapped in markdown fences with preamble", () => {
    const raw = `Here is the email:\n\`\`\`json\n{"subject":"Hi","html":"<p>Hello</p>"}\n\`\`\``;
    expect(parseJsonObject<{ subject: string }>(raw).subject).toBe("Hi");
  });

  it("extracts JSON object from trailing prose", () => {
    const raw = `Sure! {"subject":"A","html":"<p>B</p>"} Let me know if you need changes.`;
    expect(parseJsonObject<{ html: string }>(raw).html).toBe("<p>B</p>");
  });
});

describe("parseCampaignEmailJson", () => {
  it("falls back to HTML paragraphs when JSON is absent", () => {
    const out = parseCampaignEmailJson("Hello\n\nWorld", "Outreach");
    expect(out.subject).toBe("Outreach");
    expect(out.html).toContain("Hello");
    expect(out.html).toContain("World");
  });
});

describe("extractJsonCandidate", () => {
  it("returns fenced block when present", () => {
    expect(extractJsonCandidate('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
});
