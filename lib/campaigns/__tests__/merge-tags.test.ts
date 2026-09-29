import { resolveMergeTags } from "@/lib/campaigns/merge-tags";

describe("resolveMergeTags — homepage tags", () => {
  const target = {
    first_name: "Ada",
    company: "Acme",
    homepage_url: "https://previews.radeengineering.com/p/acme",
    homepage_screenshot: "https://cdn.example.com/acme.png",
  };

  it("resolves homepage_url and homepage_screenshot", () => {
    const out = resolveMergeTags(
      `<a href="{{homepage_url}}">preview</a><img src="{{homepage_screenshot}}">`,
      target
    );
    expect(out).toBe(
      `<a href="https://previews.radeengineering.com/p/acme">preview</a><img src="https://cdn.example.com/acme.png">`
    );
  });

  it("resolves missing homepage tags to empty string", () => {
    const out = resolveMergeTags(`[{{homepage_url}}][{{homepage_screenshot}}]`, {
      first_name: "Ada",
    });
    expect(out).toBe(`[][]`);
  });

  it("still resolves the original five tags", () => {
    const out = resolveMergeTags(`Hi {{first_name}} at {{company}}`, target);
    expect(out).toBe(`Hi Ada at Acme`);
  });
});
