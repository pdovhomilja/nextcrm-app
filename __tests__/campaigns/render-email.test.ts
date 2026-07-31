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

  it("includes a visible unsubscribe link pointing at the given URL", async () => {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });

    expect(html).toContain(`href="${unsubscribeUrl}"`);
    expect(html.toLowerCase()).toContain("unsubscribe");
  });
});
