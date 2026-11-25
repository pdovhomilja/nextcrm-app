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

  describe("inline CSS allowlist", () => {
    // What the TipTap editor (StarterKit + Link + Underline) saves: no inline styles.
    const tiptapHtml =
      '<h2>Spring offer</h2><p>Hi <strong>Jane</strong>, <em>new</em> <u>prices</u> and <s>old</s> ones.</p>' +
      '<ul><li><p>First</p></li></ul><blockquote><p>Quote</p></blockquote>' +
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">Read more</a></p>';

    // Typical inline-styled email body from the AI template generator.
    const aiHtml =
      '<table width="100%" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse">' +
      '<tr><td style="background-color:#f4f4f4;padding:24px 16px;text-align:center;border-bottom:1px solid #dddddd">' +
      '<h1 style="color:#1a1a1a;font-family:Arial, Helvetica, sans-serif;font-size:24px;font-weight:bold;line-height:1.3;margin:0">Welcome</h1>' +
      "</td></tr>" +
      '<tr><td style="padding-top:16px;padding-right:24px;padding-bottom:16px;padding-left:24px;vertical-align:top">' +
      '<p style="color:rgb(51, 51, 51);font-size:16px;font-style:italic;text-align:left;margin-bottom:12px">Thanks for joining.</p>' +
      '<a href="https://example.com" style="display:inline-block;background-color:#0066cc;color:#ffffff;padding:12px 24px;border-radius:4px;text-decoration:none">Get started</a>' +
      '<img src="https://example.com/logo.png" alt="Logo" width="120" height="40" style="display:block;height:auto;border:0" />' +
      "</td></tr></table>";

    it("keeps TipTap editor output unchanged", async () => {
      const html = await renderCampaignEmail({ contentHtml: tiptapHtml, unsubscribeUrl });
      expect(html).toContain(tiptapHtml);
    });

    it("keeps colors, alignment and spacing of an AI-generated template", async () => {
      const html = await renderCampaignEmail({ contentHtml: aiHtml, unsubscribeUrl });
      expect(html).toContain(aiHtml);
    });

    it("keeps the wider inline CSS the AI template generator emits", async () => {
      const generatorHtml =
        '<table width="100%" style="table-layout:fixed;border-spacing:0;min-width:320px">' +
        '<tr><td style="background:#1a1a1a;max-height:120px;border-bottom-color:#333333;border-bottom-style:solid;border-bottom-width:2px">' +
        '<h1 style="font:bold 22px/28px Arial, sans-serif;letter-spacing:1px;text-transform:uppercase;color:#ffffff">News</h1>' +
        "</td></tr><tr><td>" +
        '<p style="text-indent:0;word-break:break-word;white-space:normal">Body</p>' +
        '<ul style="list-style-type:disc"><li>Item</li></ul>' +
        '<a href="https://example.com" style="background:#0066cc;color:#ffffff;white-space:nowrap;border-top-width:1px;border-right-color:#004c99;border-left-style:solid;padding:12px 24px">Shop now</a>' +
        "</td></tr></table>";
      const html = await renderCampaignEmail({ contentHtml: generatorHtml, unsubscribeUrl });
      expect(html).toContain(generatorHtml);
    });

    it("checks the whole value, across newlines and CSS comments", async () => {
      const html = await renderCampaignEmail({
        contentHtml:
          '<p style="color:#111111;background-color:#ffffff\nurl(https://example.com/h.png);padding:2px">g</p>' +
          '<p style="background:/* x */url(https://example.com/i.png);margin:1px">h</p>' +
          '<p style="background:#0066cc url(https://example.com/j.png);font-size:12px">i</p>',
        unsubscribeUrl,
      });

      expect(html).not.toMatch(/url\(/);
      expect(html).toContain('<p style="color:#111111;padding:2px">g</p>');
      expect(html).toContain('<p style="margin:1px">h</p>');
      expect(html).toContain('<p style="font-size:12px">i</p>');
    });

    it("drops declarations that load resources or run expressions, keeps the rest", async () => {
      const html = await renderCampaignEmail({
        contentHtml:
          '<p style="color:#123456;background-color:url(https://example.com/a.png);padding:8px">a</p>' +
          '<p style="background:url(https://example.com/b.png);background-image:url(https://example.com/c.png);text-align:center">b</p>' +
          '<p style="behavior:url(https://example.com/d.htc);width:expression(1);font-size:14px">c</p>' +
          '<p style="--brand:#ff0000;color:var(--brand);margin:0">d</p>' +
          '<ul style="list-style-image:url(https://example.com/e.png)"><li style="border-image:url(https://example.com/f.png) 30;border:1px solid #000">e</li></ul>' +
          '<p style="font-family:\'javascript:x\';color:u\\72l(https://example.com/g.png);line-height:1.5">f</p>',
        unsubscribeUrl,
      });

      expect(html).not.toMatch(/url\(|expression\(|var\(|javascript:|behavior|--brand|list-style-image|border-image|\\72/);
      expect(html).toContain('<p style="color:#123456;padding:8px">a</p>');
      expect(html).toContain('<p style="text-align:center">b</p>');
      expect(html).toContain('<p style="font-size:14px">c</p>');
      expect(html).toContain('<p style="margin:0">d</p>');
      expect(html).toContain('<ul><li style="border:1px solid #000">e</li></ul>');
      expect(html).toContain('<p style="line-height:1.5">f</p>');
    });
  });

  it("includes a visible unsubscribe link pointing at the given URL", async () => {
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });

    expect(html).toContain(`href="${unsubscribeUrl}"`);
    expect(html.toLowerCase()).toContain("unsubscribe");
  });
});
