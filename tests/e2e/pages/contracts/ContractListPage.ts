import type { Page } from "@playwright/test";
import { safeGoto } from "../../helpers/wait";
import { BaseListPage } from "../BaseListPage";

export class ContractListPage extends BaseListPage {
  static readonly urlPattern = /\/crm\/contracts/;

  static from(page: Page): ContractListPage {
    return new ContractListPage(page);
  }

  static async create(page: Page): Promise<ContractListPage> {
    const instance = new ContractListPage(page);
    await instance.validateRoute();
    return instance;
  }

  private constructor(page: Page) {
    super(page, "+");
  }

  async open(): Promise<void> {
    await safeGoto(this.page, "/en/crm/contracts");
    await this.page.waitForURL(ContractListPage.urlPattern, { timeout: 10_000 });
    await this.table.waitFor({ state: "visible", timeout: 10_000 });
  }

  async clickNew(): Promise<void> {
    await this.newButton.click();
    await this.page.locator("[data-state='open']").first().waitFor({ state: "visible", timeout: 10_000 });
  }

  clickNewDialogText(): string {
    return "New contract";
  }

  async clickRow(name: string): Promise<void> {
    const row = await this.getRow(name);
    await row.getByRole("button", { name: "Open menu" }).click();
    await this.page.getByRole("menuitem", { name: "View" }).click();
  }
}
