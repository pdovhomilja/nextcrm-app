import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class LeadFormPage extends BaseFormPage {
  static readonly urlPattern = /\/crm\/leads\/(new|[a-f0-9-]+)/;

  static from(page: Page): LeadFormPage {
    return new LeadFormPage(page);
  }

  static async create(page: Page): Promise<LeadFormPage> {
    const instance = new LeadFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.lastNameInput = page.getByRole("textbox", { name: "Last name" });
    this.firstNameInput = page.getByRole("textbox", { name: "First name" });
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.phoneInput = page.getByRole("textbox", { name: "Phone" });
    this.companyInput = page.getByRole("textbox", { name: "Company" });
    this.jobTitleInput = page.getByRole("textbox", { name: "Job title" });
    this.submitButton = page.getByRole("button", { name: /create lead|update lead/i });
  }

  readonly lastNameInput: Locator;
  readonly firstNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly companyInput: Locator;
  readonly jobTitleInput: Locator;
  readonly submitButton: Locator;

  async fill(data: {
    last_name?: string;
    first_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    job_title?: string;
    description?: string;
  }): Promise<void> {
    if (data.last_name) await this.lastNameInput.fill(data.last_name);
    if (data.first_name) await this.firstNameInput.fill(data.first_name);
    if (data.email) await this.emailInput.fill(data.email);
    if (data.phone) await this.phoneInput.fill(data.phone);
    if (data.company) await this.companyInput.fill(data.company);
    if (data.job_title) await this.jobTitleInput.fill(data.job_title);
    if (data.description) {
      await this.page.getByRole("textbox", { name: "Description" }).fill(data.description);
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
