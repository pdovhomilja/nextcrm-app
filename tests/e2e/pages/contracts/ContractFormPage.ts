import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class ContractFormPage extends BaseFormPage {
  static readonly urlPattern = /\/crm\/contracts\/(new|[a-f0-9-]+)/;

  static from(page: Page): ContractFormPage {
    return new ContractFormPage(page);
  }

  static async create(page: Page): Promise<ContractFormPage> {
    const instance = new ContractFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.titleInput = page.getByRole("textbox", { name: "Title" });
    this.valueInput = page.getByRole("textbox", { name: "Value" });
    this.descriptionInput = page.getByRole("textbox", { name: "Description" });
    this.submitButton = page.getByRole("button", { name: /create|update|save/i });
  }

  readonly titleInput: Locator;
  readonly valueInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;

  async fill(data: { title?: string; value?: string; currency?: string; description?: string }): Promise<void> {
    if (data.title) await this.titleInput.fill(data.title);
    if (data.value) await this.valueInput.fill(data.value);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.currency) {
      const section = this.page.locator("text=Currency").locator("..");
      await section.getByRole("combobox").click();
      await this.page
        .getByRole("option", { name: new RegExp(data.currency, "i") })
        .first()
        .click();
    }
  }

  async save(): Promise<void> {
    await this.submitButton.click();
    await this.page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .waitFor({ state: "hidden", timeout: 15_000 });
  }
}
