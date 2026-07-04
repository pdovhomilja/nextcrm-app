import type { Page } from "@playwright/test";
import { safeGoto } from "../../helpers/wait";
import { BaseListPage } from "../BaseListPage";

export class LeadListPage extends BaseListPage {
  static readonly urlPattern = /\/crm\/leads/;

  static from(page: Page): LeadListPage {
    return new LeadListPage(page);
  }

  static async create(page: Page): Promise<LeadListPage> {
    const instance = new LeadListPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, "Add new");
  }

  async open(): Promise<void> {
    await safeGoto(this.page, "/en/crm/leads");
    await this.page.waitForURL(LeadListPage.urlPattern, { timeout: 10_000 });
    await this.table.waitFor({ state: "visible", timeout: 10_000 });
  }

  async clickNew(): Promise<void> {
    await this.newButton.click();
    await this.page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  clickNewDialogText(): string {
    return "Create new lead";
  }

  async clickRow(name: string): Promise<void> {
    await this.table.getByRole("link", { name }).click();
  }
}
