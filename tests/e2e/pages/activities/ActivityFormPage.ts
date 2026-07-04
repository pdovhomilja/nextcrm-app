import { expect, type Locator, type Page } from "@playwright/test";

export class ActivityFormPage {
  readonly page: Page;
  readonly typeSelect: Locator;
  readonly titleInput: Locator;
  readonly dateInput: Locator;
  readonly statusSelect: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.typeSelect = page.locator("#activity-type");
    this.titleInput = page.locator("#activity-title");
    this.dateInput = page.locator("#activity-date");
    this.statusSelect = page.locator("#activity-status");
    this.descriptionInput = page.locator("#activity-description");
    this.submitButton = page.getByRole("button", { name: /log activity|save changes/i });
  }

  static async create(page: Page): Promise<ActivityFormPage> {
    const instance = new ActivityFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  async validateFormVisible(): Promise<void> {
    await this.page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  }

  async fill(data: {
    type?: string;
    title?: string;
    description?: string;
    date?: string;
    status?: string;
  }): Promise<void> {
    if (data.type) {
      await this.typeSelect.click();
      await this.page.getByRole("option", { name: new RegExp(data.type, "i") }).first().click();
    }
    if (data.title) await this.titleInput.fill(data.title);
    if (data.date) await this.dateInput.fill(data.date);
    if (data.status) {
      await this.statusSelect.click();
      await this.page.getByRole("option", { name: new RegExp(data.status, "i") }).first().click();
    }
    if (data.description) await this.descriptionInput.fill(data.description);
  }

  async save(): Promise<void> {
    await this.submitButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.page.locator(`text=${message}`).first()).toBeVisible({ timeout: 5_000 });
  }

  async expectFormClosed(): Promise<void> {
    await this.page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .waitFor({ state: "hidden", timeout: 10_000 });
  }
}
