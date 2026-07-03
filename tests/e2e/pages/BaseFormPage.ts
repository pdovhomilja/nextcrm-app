import { expect, type Locator, type Page } from "@playwright/test";

export abstract class BaseFormPage {
  static readonly urlPattern: RegExp;

  protected readonly page: Page;
  abstract readonly submitButton: Locator;

  protected constructor(page: Page) {
    this.page = page;
  }

  async validateRoute(): Promise<void> {
    const Pattern = (this.constructor as typeof BaseFormPage).urlPattern;
    await this.page.waitForURL(Pattern, { timeout: 10_000 });
  }

  abstract fill(data: Record<string, string | undefined>): Promise<void>;

  async save(): Promise<void> {
    await this.submitButton.click();
    await this.page.getByRole("dialog").first().waitFor({ state: "hidden", timeout: 15_000 });
  }

  async validateFormVisible(): Promise<void> {
    await this.page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  async saveExpectError(): Promise<void> {
    await this.submitButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.page.locator(`text=${message}`).first()).toBeVisible({ timeout: 5_000 });
  }
}
