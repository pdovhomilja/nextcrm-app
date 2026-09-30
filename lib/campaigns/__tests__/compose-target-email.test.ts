import {
  composeTargetEmailContent,
  buildTargetMergeSource,
  TemplateBodyError,
} from "@/lib/campaigns/compose-target-email";

describe("composeTargetEmailContent", () => {
  const mergeSource = { first_name: "Ada", company: "Acme", homepage_url: "", homepage_screenshot: "" };

  it("inserts the AI body at {{body}} and resolves personalization", () => {
    const out = composeTargetEmailContent({
      templateHtml: `<div>Hello {{first_name}}</div>{{body}}<footer>{{company}}</footer>`,
      bodyHtml: `<p>Custom pitch for {{company}}</p>`,
      mergeSource,
    });
    expect(out).toBe(`<div>Hello Ada</div><p>Custom pitch for Acme</p><footer>Acme</footer>`);
  });

  it("throws when the template has no {{body}} placeholder", () => {
    expect(() =>
      composeTargetEmailContent({ templateHtml: `<div>No slot</div>`, bodyHtml: `<p>x</p>`, mergeSource })
    ).toThrow(TemplateBodyError);
  });

  it("does not re-escape the raw AI body HTML tags", () => {
    const out = composeTargetEmailContent({
      templateHtml: `{{body}}`,
      bodyHtml: `<strong>bold</strong>`,
      mergeSource,
    });
    expect(out).toBe(`<strong>bold</strong>`);
  });
});

describe("buildTargetMergeSource", () => {
  const target = { first_name: "Ada", last_name: "L", email: "ada@acme.com", company: "Acme", position: "CTO" };

  it("uses homepage URLs only when status is READY", () => {
    const ready = buildTargetMergeSource(target, {
      status: "READY",
      preview_url: "https://p/acme",
      screenshot_url: "https://s/acme.png",
    });
    expect(ready.homepage_url).toBe("https://p/acme");
    expect(ready.homepage_screenshot).toBe("https://s/acme.png");
  });

  it("blanks homepage URLs when no homepage / not READY", () => {
    const none = buildTargetMergeSource(target, null);
    expect(none.homepage_url).toBe("");
    expect(none.homepage_screenshot).toBe("");
    const pending = buildTargetMergeSource(target, { status: "PENDING", preview_url: "x", screenshot_url: "y" });
    expect(pending.homepage_url).toBe("");
  });
});
