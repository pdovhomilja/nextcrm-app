import { extractLinkedInPostSnippets } from "@/lib/linkedin/post-text";

describe("extractLinkedInPostSnippets", () => {
  it("pulls commentary text from nested payloads", () => {
    const snippets = extractLinkedInPostSnippets([
      { commentary: { text: "We launched a new enterprise CRM integration today." } },
    ]);
    expect(snippets[0]).toContain("CRM integration");
  });
});
