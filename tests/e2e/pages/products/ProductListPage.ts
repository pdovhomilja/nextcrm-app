import type { Page } from "@playwright/test";
import { safeGoto } from "../../helpers/wait";
import { BaseListPage } from "../BaseListPage";

export class ProductListPage extends BaseListPage {
  static readonly urlPattern = /\/crm\/products/;

  static from(page: Page): ProductListPage {
    return new ProductListPage(page);
  }

  static async create(page: Page): Promise<ProductListPage> {
    const instance = new ProductListPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, "+");
  }

  clickNewDialogText(): string {
    return "Create Product";
  }

  async open(): Promise<void> {
    await safeGoto(this.page, "/en/crm/products");
    await this.page
      .getByRole("table")
      .or(this.page.getByText(/No products found/))
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  async clickNew(): Promise<void> {
    await this.page.getByRole("button", { name: "+" }).click();
    await this.page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 10_000 });
  }

  async clickRow(name: string): Promise<void> {
    await this.table.locator("tr, [role='row']").filter({ hasText: name }).first().click();
  }

  async clickImport(): Promise<void> {
    await this.page.locator("button:has-text('Import')").first().click();
  }
}
