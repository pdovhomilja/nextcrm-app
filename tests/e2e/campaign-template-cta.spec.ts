import { test, expect } from "@playwright/test";

// Parity: docs/testing/campaign-branded-shell-manual-testing.md
//
// Exercises the REAL preview path (TemplateEditorForm → previewTemplate server
// action → renderCampaignEmail → the branded shell). Nothing is stubbed, so
// reverting the branded shell or the CTA rendering makes these fail.
test.describe("Campaign template — branded shell + CTA button", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  async function fillEditorBasics(page: import("@playwright/test").Page) {
    await page.goto("/en/campaigns/templates/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.getByLabel("Template Name *")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Template Name *").fill("PW CTA Template");
    await page.getByLabel("Subject Line *").fill("Hello from Rade");

    const editor = page
      .locator(".tiptap, .ProseMirror, [contenteditable='true']")
      .first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await editor.pressSequentially("This is the body of the email.");
  }

  async function previewSrcdoc(page: import("@playwright/test").Page) {
    await page.getByRole("tab", { name: /^Preview$/ }).click();
    const iframe = page.locator('iframe[title="Email preview"]');
    // previewTemplate is an async server action — poll until the branded shell lands.
    await expect
      .poll(
        async () =>
          (await iframe.count()) ? (await iframe.getAttribute("srcdoc")) ?? "" : "",
        { timeout: 15000 }
      )
      .toContain("RADE");
    return (await iframe.getAttribute("srcdoc")) ?? "";
  }

  test("renders the branded shell with an amber CTA button when label + link are set", async ({
    page,
  }) => {
    await fillEditorBasics(page);

    await page.getByLabel("Button label").fill("Book a call");
    await page.getByLabel("Button link").fill("https://radeengineering.com/book");

    const srcdoc = await previewSrcdoc(page);

    // Branded shell chrome
    expect(srcdoc).toContain("ENGINEERING");
    // CTA button (label + href) — proves the shell rendered the button
    expect(srcdoc).toContain("Book a call");
    expect(srcdoc).toContain("https://radeengineering.com/book");
    // Brand amber token present (the button fill)
    expect(srcdoc.toLowerCase()).toContain("#e6a92e");
  });

  test("omits the CTA button when label/link are empty (shell still branded)", async ({
    page,
  }) => {
    await fillEditorBasics(page);
    // Leave Button label / Button link empty.

    const srcdoc = await previewSrcdoc(page);

    expect(srcdoc).toContain("ENGINEERING"); // shell still branded
    expect(srcdoc).not.toContain("Book a call"); // no button rendered
  });
});
