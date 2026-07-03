import type { Page } from "@playwright/test";
import { BaseListPage } from "../BaseListPage";

export class TargetListPage extends BaseListPage {
  static readonly urlPattern = /\/campaigns\/targets/;

  static from(page: Page): TargetListPage {
    return new TargetListPage(page);
  }

  static async create(page: Page): Promise<TargetListPage> {
    const instance = new TargetListPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, "+");
  }

  async open(): Promise<void> {
    await this.page.goto("/en/campaigns/targets");
    await this.page
      .getByRole("table")
      .or(this.page.getByText(/No targets found/))
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  clickNewDialogText(): string {
    return "Create new target";
  }

  async clickRow(name: string): Promise<void> {
    await this.table.locator("tr, [role='row']").filter({ hasText: name }).first().click();
  }
}
