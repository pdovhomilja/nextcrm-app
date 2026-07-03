import type { Page } from "@playwright/test";
import { BaseDetailPage } from "../BaseDetailPage";

export class TargetDetailPage extends BaseDetailPage {
  static readonly urlPattern = /\/campaigns\/targets\/[a-f0-9-]+/;

  static from(page: Page): TargetDetailPage {
    return new TargetDetailPage(page);
  }

  static async create(page: Page): Promise<TargetDetailPage> {
    const instance = new TargetDetailPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, page.locator("button:has-text('Edit'), button:has-text('Delete')").first());
  }

  async clickUpdate(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Update" }).click();
  }

  async clickConvert(): Promise<void> {
    await this.page.locator("button:has-text('Convert')").first().click();
  }

  async confirmConvert(): Promise<void> {
    await this.page.locator("button:has-text('Convert')").last().click();
  }

  async clickDelete(): Promise<void> {
    await this.page.locator("button:has-text('Delete')").first().click();
  }
}
