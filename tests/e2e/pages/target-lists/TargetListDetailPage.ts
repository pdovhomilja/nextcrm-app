import type { Page } from "@playwright/test";
import { BaseDetailPage } from "../BaseDetailPage";

export class TargetListDetailPage extends BaseDetailPage {
  static readonly urlPattern = /\/campaigns\/target-lists\/[a-f0-9-]+/;

  static from(page: Page): TargetListDetailPage {
    return new TargetListDetailPage(page);
  }

  static async create(page: Page): Promise<TargetListDetailPage> {
    const instance = new TargetListDetailPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, page.getByRole("button", { name: "Open menu" }).first());
  }

  async clickUpdate(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Update" }).click();
  }

  async clickDelete(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Delete" }).click();
  }

  async clickCopyFromOpportunity(): Promise<void> {
    await this.page.getByRole("button", { name: /Copy from Opportunity/ }).click();
  }
}
