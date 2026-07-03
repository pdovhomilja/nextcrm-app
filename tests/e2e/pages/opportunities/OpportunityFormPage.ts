import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class OpportunityFormPage extends BaseFormPage {
  static readonly urlPattern = /\/crm\/opportunities\/(new|[a-f0-9-]+)/;

  static from(page: Page): OpportunityFormPage {
    return new OpportunityFormPage(page);
  }

  static async create(page: Page): Promise<OpportunityFormPage> {
    const instance = new OpportunityFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.nameInput = page.getByRole("textbox", { name: "Name" });
    this.budgetInput = page.getByRole("textbox", { name: "Budget" });
    this.currencyTrigger = page.getByRole("combobox", { name: /currency/i });
    this.closeDateTrigger = page.getByRole("button", { name: /close date/i });
    this.descriptionInput = page.getByRole("textbox", { name: "Description" });
    this.nextStepInput = page.getByRole("textbox", { name: /next step/i });
    this.submitButton = page.getByRole("button", { name: /create|update/i });
  }

  readonly nameInput: Locator;
  readonly budgetInput: Locator;
  readonly currencyTrigger: Locator;
  readonly closeDateTrigger: Locator;
  readonly descriptionInput: Locator;
  readonly nextStepInput: Locator;
  readonly submitButton: Locator;

  async fill(data: {
    name?: string;
    budget?: string;
    currency?: string;
    close_date?: string;
    description?: string;
    next_step?: string;
  }): Promise<void> {
    if (data.name) await this.nameInput.fill(data.name);
    if (data.budget) await this.budgetInput.fill(data.budget);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.next_step) await this.nextStepInput.fill(data.next_step);
    if (data.currency) {
      await this.currencyTrigger.click();
      await this.page
        .getByRole("option", { name: new RegExp(data.currency, "i") })
        .first()
        .click();
    }
    if (data.close_date) {
      await this.closeDateTrigger.click();
      const [, , day] = data.close_date.split("-").map(Number);
      await this.page
        .getByRole("gridcell", { name: String(day) })
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
