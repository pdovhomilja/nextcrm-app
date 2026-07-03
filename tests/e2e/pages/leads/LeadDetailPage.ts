import type { Page } from "@playwright/test";
import { BaseDetailPage } from "../BaseDetailPage";

export class LeadDetailPage extends BaseDetailPage {
  static readonly urlPattern = /\/crm\/leads\/[a-f0-9-]+/;

  static from(page: Page): LeadDetailPage {
    return new LeadDetailPage(page);
  }

  static async create(page: Page): Promise<LeadDetailPage> {
    const instance = new LeadDetailPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, page.getByTestId("lead-detail-actions-btn"));
  }

  async clickUpdate(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Update" }).click();
  }

  async clickDelete(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Delete" }).click();
  }

  async clickConvert(): Promise<void> {
    await this.page.getByRole("button", { name: /Convert/ }).click();
  }
}
