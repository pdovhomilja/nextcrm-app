import { resolveMergeTags } from "@/lib/campaigns/merge-tags";

describe("resolveMergeTags", () => {
  const target = {
    first_name: "John",
    last_name: "Smith",
    email: "john@acme.com",
    company: "Acme Inc",
    position: "CEO",
  };

  it("replaces all known merge tags", () => {
    const html = "<p>Hi {{first_name}} {{last_name}}, from {{company}}</p>";
    expect(resolveMergeTags(html, target)).toBe(
      "<p>Hi John Smith, from Acme Inc</p>"
    );
  });

  it("replaces {{email}} and {{position}}", () => {
    const html = "{{email}} - {{position}}";
    expect(resolveMergeTags(html, target)).toBe("john@acme.com - CEO");
  });

  it("leaves unknown tags as-is", () => {
    const html = "{{unknown_tag}}";
    expect(resolveMergeTags(html, target)).toBe("{{unknown_tag}}");
  });

  it("handles missing target fields gracefully (uses empty string)", () => {
    const html = "{{first_name}} {{company}}";
    expect(resolveMergeTags(html, { last_name: "Smith" })).toBe(" ");
  });
});
