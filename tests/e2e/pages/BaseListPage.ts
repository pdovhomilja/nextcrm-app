import { expect, type Locator, type Page } from "@playwright/test";
import { Modal } from "../components/Modal";

export abstract class BaseListPage {
  static readonly urlPattern: RegExp;

  protected readonly page: Page;
  readonly newButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;

  protected constructor(page: Page, newButtonText: string) {
    this.page = page;
    this.newButton = page.getByRole("button", { name: newButtonText });
    this.searchInput = page.getByPlaceholder(/filter/i);
    this.table = page.locator("table").first();
  }

  static async create(page: Page): Promise<BaseListPage> {
    const instance = new (BaseListPage as any)(page);
    await instance.validateRoute();
    await instance.table.waitFor({ state: "visible", timeout: 10_000 });
    return instance;
  }

  async validateRoute(): Promise<void> {
    const Pattern = (this.constructor as typeof BaseListPage).urlPattern;
    await this.page.waitForURL(Pattern, { timeout: 10_000 });
  }

  abstract open(): Promise<void>;

  abstract clickNewDialogText(): string;

  async clickNew(): Promise<void> {
    await this.newButton.click();
    await this.page
      .getByRole("dialog")
      .filter({ hasText: this.clickNewDialogText() })
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  async search(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await this.page.keyboard.press("Enter");
  }

  async getRow(name: string): Promise<Locator> {
    return this.table.locator("tr").filter({ hasText: name }).first();
  }

  async expectVisible(name: string): Promise<void> {
    const row = await this.getRow(name);
    await expect(row).toBeVisible({ timeout: 10_000 });
  }

  async expectNotVisible(name: string): Promise<void> {
    const row = await this.getRow(name);
    await expect(row).not.toBeVisible();
  }

  abstract clickRow(name: string): Promise<void>;

  async clickRowMenu(name: string): Promise<void> {
    const row = await this.getRow(name);
    await row.getByRole("button", { name: "Open menu" }).click();
  }

  async clickDelete(): Promise<void> {
    await this.clickMenuItem(/Delete/);
  }

  async clickMenuItem(name: string | RegExp): Promise<void> {
    await this.page.getByRole("menuitem", { name }).click();
  }

  async confirmDelete(): Promise<void> {
    const modal = new Modal(this.page);
    await modal.confirm();
  }
}
