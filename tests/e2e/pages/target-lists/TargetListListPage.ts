import type { Page } from "@playwright/test";
import { BaseListPage } from "../BaseListPage";

export class TargetListListPage extends BaseListPage {
  static readonly urlPattern = /\/campaigns\/target-lists/;

  static from(page: Page): TargetListListPage {
    return new TargetListListPage(page);
  }

  static async create(page: Page): Promise<TargetListListPage> {
    const instance = new TargetListListPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, "+");
  }

  async open(): Promise<void> {
    await this.page.goto("/en/campaigns/target-lists");
    await this.page
      .getByRole("table")
      .or(this.page.getByText(/No .* found/))
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  clickNewDialogText(): string {
    return "Create Target List";
  }

  async clickRow(name: string): Promise<void> {
    const row = await this.getRow(name);
    row.getByRole("button", { name: "Open menu" }).click();

    const viewItem = this.page.getByRole("menuitem", { name: "View" });
    await viewItem.waitFor({ state: "visible", timeout: 5_000 });
    await viewItem.click();
  }
}
