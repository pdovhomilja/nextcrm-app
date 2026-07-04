import { expect, type Page } from "@playwright/test";

export class PermissionsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectButtonNotVisible(url: string, buttonName: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForURL(new RegExp(url.replace(/\/en\//, "/")), { timeout: 10_000 });
    const button = this.page.locator(`button:has-text('${buttonName}')`).first();
    await expect(button).not.toBeVisible({ timeout: 5_000 });
  }

  async expectNewButtonNotVisible(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForURL(new RegExp(url.replace(/\/en\//, "/")), { timeout: 10_000 });
    const button = this.page.locator("button:has-text('New Product'), button:has-text('+')").first();
    await expect(button).not.toBeVisible({ timeout: 5_000 });
  }
}
