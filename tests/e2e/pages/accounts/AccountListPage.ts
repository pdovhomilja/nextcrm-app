import type { Page } from "@playwright/test";
import { safeGoto } from "../../helpers/wait";
import { BaseListPage } from "../BaseListPage";

export class AccountListPage extends BaseListPage {
  static readonly urlPattern = /\/crm\/accounts/;

  static from(page: Page): AccountListPage {
    return new AccountListPage(page);
  }

  static async create(page: Page): Promise<AccountListPage> {
    const instance = new AccountListPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, "Add new account");
  }

  async open(): Promise<void> {
    await safeGoto(this.page, "/en/crm/accounts");
    await this.page.waitForURL(AccountListPage.urlPattern, { timeout: 10_000 });
    await this.table.waitFor({ state: "visible", timeout: 10_000 });
  }

  clickNewDialogText(): string {
    return "Create new Account";
  }

  async clickRow(name: string): Promise<void> {
    await this.table.getByRole("link", { name }).click();
  }
}
