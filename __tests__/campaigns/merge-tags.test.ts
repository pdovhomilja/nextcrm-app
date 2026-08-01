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

describe("resolveMergeTags with escapeHtml", () => {
  it("HTML-escapes merge tag values when escapeHtml is true", () => {
    const target = {
      first_name: '<img src=x onerror=alert(1)>',
      company: "O'Brien & Co <CEO>",
    };
    const out = resolveMergeTags(
      "<p>Hi {{first_name}} from {{company}}</p>",
      target,
      true
    );
    expect(out).toBe(
      "<p>Hi &lt;img src=x onerror=alert(1)&gt; from O&#39;Brien &amp; Co &lt;CEO&gt;</p>"
    );
  });

  it("does not escape by default", () => {
    const out = resolveMergeTags("{{company}}", { company: "A & B" });
    expect(out).toBe("A & B");
  });
});
