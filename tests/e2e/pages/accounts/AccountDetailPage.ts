import { expect, type Page } from "@playwright/test";
import { BaseDetailPage } from "../BaseDetailPage";

export class AccountDetailPage extends BaseDetailPage {
  static readonly urlPattern = /\/crm\/accounts\/[a-f0-9-]+/;

  static from(page: Page): AccountDetailPage {
    return new AccountDetailPage(page);
  }

  static async create(page: Page): Promise<AccountDetailPage> {
    const instance = new AccountDetailPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, page.getByTestId("account-detail-actions-btn"));
  }

  async clickUpdate(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Update" }).click();
  }

  async clickNewTask(): Promise<void> {
    const tasksSection = this.page.locator("text=Tasks").locator("..");
    await tasksSection.getByRole("button", { name: "+" }).click();
  }

  async expectStatus(status: string): Promise<void> {
    await expect(this.page.getByText("Status").first()).toBeVisible();
    await expect(this.page.getByText(status).first()).toBeVisible();
  }
}
