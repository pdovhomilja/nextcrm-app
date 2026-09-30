import { renderCampaignEmail } from "@/lib/campaigns/render-email";

describe("renderCampaignEmail", () => {
  const contentHtml = "<p>Hello <strong>Jane</strong>, welcome aboard!</p>";
  const unsubscribeUrl =
    "https://app.example.com/api/campaigns/unsubscribe?token=token-abc";

  it("wraps the template content in a full HTML email document", async () => {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain(contentHtml);
  });

  it("renders a styled body with the branded page background", async () => {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });

    expect(html).toMatch(/<body[^>]*style=/);
    expect(html).toContain("#eef1f6"); // page background token
  });

  it("includes the Rade-branded header (wordmark, tagline, logo)", async () => {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });

    expect(html).toContain("RADE");
    expect(html).toContain("ENGINEERING");
    expect(html).toContain("Decrypting technology for small business");
    expect(html).toContain("radeengineering.com/gears-mark.png");
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

  describe("CTA button", () => {
    it("renders the amber button when both a label and a safe URL are given", async () => {
      const html = await renderCampaignEmail({
        contentHtml,
        unsubscribeUrl,
        ctaLabel: "Book a call",
        ctaUrl: "https://radeengineering.com/book",
      });

      expect(html).toContain("Book a call");
      expect(html).toContain('href="https://radeengineering.com/book"');
      expect(html).toContain("#e6a92e"); // amber
    });

    it("omits the button when only one of label/url is provided", async () => {
      const onlyLabel = await renderCampaignEmail({
        contentHtml,
        unsubscribeUrl,
        ctaLabel: "Book a call",
      });
      const onlyUrl = await renderCampaignEmail({
        contentHtml,
        unsubscribeUrl,
        ctaUrl: "https://radeengineering.com/book",
      });

      expect(onlyLabel).not.toContain("Book a call");
      expect(onlyUrl).not.toContain("radeengineering.com/book");
    });

    it("refuses a CTA URL with an unsafe scheme (no button rendered)", async () => {
      const html = await renderCampaignEmail({
        contentHtml,
        unsubscribeUrl,
        ctaLabel: "Click me",
        ctaUrl: "javascript:alert(1)",
      });

      expect(html).not.toContain("javascript:alert");
      expect(html).not.toContain("Click me");
    });

    it("escapes HTML in the CTA label", async () => {
      const html = await renderCampaignEmail({
        contentHtml,
        unsubscribeUrl,
        ctaLabel: '<script>x</script>',
        ctaUrl: "https://radeengineering.com/book",
      });

      expect(html).not.toContain("<script>x</script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  describe("mailing address (CAMPAIGN_MAILING_ADDRESS)", () => {
    const original = process.env.CAMPAIGN_MAILING_ADDRESS;
    afterEach(() => {
      if (original === undefined) delete process.env.CAMPAIGN_MAILING_ADDRESS;
      else process.env.CAMPAIGN_MAILING_ADDRESS = original;
    });

    it("includes the address in the footer when set", async () => {
      process.env.CAMPAIGN_MAILING_ADDRESS = "123 Main St, Springfield, IL 62701";
      const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });
      expect(html).toContain("123 Main St, Springfield, IL 62701");
    });

    it("omits the address line when unset", async () => {
      delete process.env.CAMPAIGN_MAILING_ADDRESS;
      const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });
      // Footer intro is still present, but no <br>-prefixed address follows it.
      expect(html).toContain("You’re receiving this because");
      expect(html).not.toMatch(/receiving this because[\s\S]*?<br>/);
    });
  });
});
