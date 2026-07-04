import { expect, type Locator, type Page } from "@playwright/test";

export class ActivityFeedPage {
  readonly page: Page;
  readonly logButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logButton = page.getByRole("button", { name: "Log activity" });
  }

  async clickLogActivity(): Promise<void> {
    await this.logButton.click();
  }

  async expectActivityVisible(title: string): Promise<void> {
    const activityText = this.page.getByText(title).first();
    await expect(activityText).toBeVisible({ timeout: 10_000 });
  }

  async expectActivityNotVisible(title: string): Promise<void> {
    const activityText = this.page.getByText(title).first();
    await expect(activityText).not.toBeVisible();
  }

  async expectValidationError(message: string): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible({ timeout: 5_000 });
  }
}
