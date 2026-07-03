import type { Page } from "@playwright/test";
import { BaseListPage } from "../BaseListPage";

export class ContactListPage extends BaseListPage {
  static readonly urlPattern = /\/crm\/contacts/;

  static from(page: Page): ContactListPage {
    return new ContactListPage(page);
  }

  static async create(page: Page): Promise<ContactListPage> {
    const instance = new ContactListPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, "Add new contact");
  }

  async open(): Promise<void> {
    await this.page.goto("/en/crm/contacts");
    await this.page.waitForURL(ContactListPage.urlPattern, { timeout: 10_000 });
    await this.table.waitFor({ state: "visible", timeout: 10_000 });
  }

  clickNewDialogText(): string {
    return "Create new Contact";
  }

  async clickRow(name: string): Promise<void> {
    await this.table.getByRole("link", { name }).click();
  }
}
