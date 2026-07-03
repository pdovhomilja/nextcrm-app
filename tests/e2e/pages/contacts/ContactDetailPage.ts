import { expect, type Page } from "@playwright/test";
import { BaseDetailPage } from "../BaseDetailPage";

export class ContactDetailPage extends BaseDetailPage {
  static readonly urlPattern = /\/crm\/contacts\/[a-f0-9-]+/;

  static from(page: Page): ContactDetailPage {
    return new ContactDetailPage(page);
  }

  static async create(page: Page): Promise<ContactDetailPage> {
    const instance = new ContactDetailPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, page.getByRole("button", { name: "Open menu" }).first());
  }

  async clickUpdate(): Promise<void> {
    await this.page.getByRole("menuitem", { name: "Update" }).click();
  }

  async expectLinkedAccount(accountName: string): Promise<void> {
    await expect(this.page.getByText("Account").first()).toBeVisible();
    await expect(this.page.getByText(accountName).first()).toBeVisible();
  }
}
