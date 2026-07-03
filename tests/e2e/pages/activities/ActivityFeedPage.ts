import { expect, type Locator, type Page } from "@playwright/test";

export class ActivityFeedPage {
  readonly page: Page;
  readonly logButton: Locator;
  readonly feed: Locator;
  readonly loadMoreButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logButton = page.getByRole("button", { name: "Log activity" });
    this.feed = page.locator(".activities, [class*='activity']").first();
    this.loadMoreButton = page.getByRole("button", { name: "Load more" });
  }

  async clickLogActivity(): Promise<void> {
    await this.logButton.click();
  }

  async expectActivityVisible(title: string): Promise<void> {
    await expect(this.feed.locator(`text=${title}`).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectActivityNotVisible(title: string): Promise<void> {
    await expect(this.feed.locator(`text=${title}`).first()).not.toBeVisible();
  }
}
