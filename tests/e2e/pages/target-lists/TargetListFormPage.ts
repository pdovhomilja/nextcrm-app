import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class TargetListFormPage extends BaseFormPage {
  static readonly urlPattern = /\/campaigns\/target-lists\/(new|[a-f0-9-]+)/;

  static from(page: Page): TargetListFormPage {
    return new TargetListFormPage(page);
  }

  static async create(page: Page): Promise<TargetListFormPage> {
    const instance = new TargetListFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.nameInput = page.getByRole("textbox", { name: "Name" });
    this.descriptionInput = page.getByRole("textbox", { name: "Description" });
    this.submitButton = page.getByRole("dialog").getByRole("button", { name: /Create|Save/ });
  }

  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;

  async fill(data: { name?: string; description?: string }): Promise<void> {
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.description !== undefined) await this.descriptionInput.fill(data.description);
  }

  async save(): Promise<void> {
    await this.submitButton.click();
    await this.page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .waitFor({ state: "hidden", timeout: 15_000 });
  }
}
