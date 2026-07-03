import type { Page } from "@playwright/test";
import { BaseListPage } from "../BaseListPage";

export class OpportunityListPage extends BaseListPage {
  static readonly urlPattern = /\/crm\/opportunities/;

  static from(page: Page): OpportunityListPage {
    return new OpportunityListPage(page);
  }

  static async create(page: Page): Promise<OpportunityListPage> {
    const instance = new OpportunityListPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, "Add new");
  }

  async open(): Promise<void> {
    await this.page.goto("/en/crm/opportunities");
    await this.page.waitForURL(OpportunityListPage.urlPattern, { timeout: 10_000 });
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
    return "Create";
  }

  async clickRow(name: string): Promise<void> {
    await this.table.getByRole("link", { name }).click();
  }
}
