import { expect, type Locator, type Page } from "@playwright/test";

export async function waitForToast(page: Page, text?: string): Promise<Locator> {
  const toast = page.locator("[data-sonner-toast], [role='status'], .toast");
  await toast.first().waitFor({ state: "visible", timeout: 10_000 });
  if (text) {
    await expect(toast.first()).toContainText(text);
  }
  return toast.first();
}

export async function waitForTableLoad(page: Page): Promise<void> {
  await page.locator("table, [role='table'], .data-table").first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
}

export async function waitForNavigation(page: Page, urlPattern: RegExp): Promise<void> {
  await page.waitForURL(urlPattern, { timeout: 10_000 });
}

export async function clickAndWaitForResponse(
  page: Page,
  locator: Locator,
  urlPattern: RegExp | string,
): Promise<void> {
  await Promise.all([
    page.waitForResponse((r) =>
      typeof urlPattern === "string" ? r.url().includes(urlPattern) : urlPattern.test(r.url()),
    ),
    locator.click(),
  ]);
}
