import type { Locator, Page } from "@playwright/test";

export class Sidebar {
  readonly page: Page;
  readonly nav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = page.locator("nav, [role='navigation'], .sidebar, aside").first();
  }

  async navigateTo(section: string): Promise<void> {
    await this.nav.locator(`a:has-text("${section}"), button:has-text("${section}")`).first().click();
  }

  async isVisible(): Promise<boolean> {
    return this.nav.isVisible();
  }
}
