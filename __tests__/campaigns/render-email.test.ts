import { renderCampaignEmail } from "@/lib/campaigns/render-email";

describe("renderCampaignEmail", () => {
  const contentHtml = "<p>Hello <strong>Jane</strong>, welcome aboard!</p>";
  const unsubscribeUrl =
    "https://app.example.com/api/campaigns/unsubscribe?token=token-abc";

  it("wraps the template content in a full HTML email document", async () => {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });

    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain(contentHtml);
  });

  it("compiles Tailwind classes to inline styles for email clients", async () => {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });

    expect(html).toContain("background-color");
    expect(html).toMatch(/<body[^>]*style=/);
  });

  it("strips script tags and event handlers while keeping formatting", async () => {
    const html = await renderCampaignEmail({
      contentHtml:
        '<p>Hi <strong>there</strong></p><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">click</a>',
      unsubscribeUrl,
    });

    expect(html).toContain("<p>Hi <strong>there</strong></p>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:alert");
  });

  it("includes a visible unsubscribe link pointing at the given URL", async () => {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });

    expect(html).toContain(`href="${unsubscribeUrl}"`);
    expect(html.toLowerCase()).toContain("unsubscribe");
  });
});
