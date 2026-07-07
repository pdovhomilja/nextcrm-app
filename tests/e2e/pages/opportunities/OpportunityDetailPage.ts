import type { Page } from "@playwright/test";
import { BaseDetailPage } from "../BaseDetailPage";

export class OpportunityDetailPage extends BaseDetailPage {
  static readonly urlPattern = /\/crm\/opportunities\/[a-f0-9-]+/;

  static from(page: Page): OpportunityDetailPage {
    return new OpportunityDetailPage(page);
  }

  static async create(page: Page): Promise<OpportunityDetailPage> {
    const instance = new OpportunityDetailPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, page.getByTestId("opportunity-detail-actions-btn"));
  }

  async clickUpdate(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Update" }).click();
  }

  async clickDelete(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Delete" }).click();
  }

  async clickAddLineItem(): Promise<void> {
    await this.page.getByRole("button", { name: /Add Line Item/ }).click();
  }
}
