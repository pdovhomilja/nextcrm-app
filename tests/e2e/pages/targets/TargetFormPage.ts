import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class TargetFormPage extends BaseFormPage {
  static readonly urlPattern = /\/campaigns\/targets\/(new|[a-f0-9-]+)/;

  static from(page: Page): TargetFormPage {
    return new TargetFormPage(page);
  }

  static async create(page: Page): Promise<TargetFormPage> {
    const instance = new TargetFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.lastNameInput = page.getByRole("textbox", { name: "Last name" });
    this.companyInput = page.getByRole("textbox", { name: "Company", exact: true });
    this.emailInput = page.getByRole("textbox", { name: "Email", exact: true });
    this.submitButton = page.getByRole("dialog").getByRole("button", { name: /Save|Create|Update/ });
  }

  readonly lastNameInput: Locator;
  readonly companyInput: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  async fill(data: { last_name?: string; company?: string; email?: string }): Promise<void> {
    if (data.last_name !== undefined) await this.lastNameInput.fill(data.last_name);
    if (data.company !== undefined) await this.companyInput.fill(data.company);
    if (data.email) await this.emailInput.fill(data.email);
  }

  async save(): Promise<void> {
    await this.submitButton.click();
    await this.page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .waitFor({ state: "hidden", timeout: 15_000 });
  }
}
