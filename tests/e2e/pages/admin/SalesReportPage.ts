import { expect, type Page } from "@playwright/test";

export class SalesReportPage {
  static readonly urlPattern = /\/reports\/sales/;

  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  static from(page: Page): SalesReportPage {
    return new SalesReportPage(page);
  }

  async open(): Promise<void> {
    await this.page.goto("/en/reports/sales");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectHeadingVisible(): Promise<void> {
    const heading = this.page.getByRole("heading");
    await expect(heading.first()).toBeVisible({ timeout: 10_000 });
  }

  async expectKpiCardsVisible(): Promise<void> {
    const kpiCards = this.page.locator("[class*='card']");
    await expect(kpiCards.first()).toBeVisible({ timeout: 10_000 });
  }
}
