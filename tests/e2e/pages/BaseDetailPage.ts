import { expect, type Locator, type Page } from "@playwright/test";

export abstract class BaseDetailPage {
  static readonly urlPattern: RegExp;

  protected readonly page: Page;
  readonly title: Locator;
  readonly menuButton: Locator;

  protected constructor(page: Page, menuButton: Locator) {
    this.page = page;
    this.title = page.locator("h2").first();
    this.menuButton = menuButton;
  }

  static async create(page: Page): Promise<BaseDetailPage> {
    const instance = new (BaseDetailPage as any)(page);
    await instance.validateRoute();
    await instance.title.waitFor({ state: "visible", timeout: 10_000 });
    return instance;
  }

  async validateRoute(): Promise<void> {
    const Pattern = (this.constructor as typeof BaseDetailPage).urlPattern;
    await this.page.waitForURL(Pattern, { timeout: 10_000 });
  }

  async waitForLoad(): Promise<void> {
    await this.title.waitFor({ state: "visible", timeout: 10_000 });
  }

  async expectName(name: string): Promise<void> {
    await expect(this.title).toContainText(name, { timeout: 10_000 });
  }

  async openMenu(): Promise<void> {
    await this.menuButton.click();
  }

  abstract clickUpdate(): Promise<void>;

  async clickEdit(): Promise<void> {
    await this.openMenu();
    await this.clickUpdate();
  }

  async clickTab(name: string): Promise<void> {
    await this.page.getByRole("tab", { name }).click();
  }
}
