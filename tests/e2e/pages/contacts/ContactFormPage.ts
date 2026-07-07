import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class ContactFormPage extends BaseFormPage {
  static readonly urlPattern = /\/crm\/contacts\/(new|[a-f0-9-]+)/;

  static from(page: Page): ContactFormPage {
    return new ContactFormPage(page);
  }

  static async create(page: Page): Promise<ContactFormPage> {
    const instance = new ContactFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByRole("textbox", { name: "First name" });
    this.lastNameInput = page.getByRole("textbox", { name: "Last name" });
    this.emailInput = page.getByRole("textbox", { name: "Email", exact: true });
    this.personalEmailInput = page.getByRole("textbox", { name: "Personal email" });
    this.officePhoneInput = page.getByRole("textbox", { name: "Office phone" });
    this.mobilePhoneInput = page.getByRole("textbox", { name: "Mobile phone" });
    this.positionInput = page.getByRole("textbox", { name: "Position" });
    this.descriptionInput = page.getByRole("textbox", { name: "Description" });
    this.websiteInput = page.getByRole("textbox", { name: "Website" });
    this.submitButton = page.getByRole("button", { name: /^(Create|Update) contact$/ });
  }

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly personalEmailInput: Locator;
  readonly officePhoneInput: Locator;
  readonly mobilePhoneInput: Locator;
  readonly positionInput: Locator;
  readonly descriptionInput: Locator;
  readonly websiteInput: Locator;
  readonly submitButton: Locator;

  async fill(data: {
    last_name?: string;
    first_name?: string;
    email?: string;
    personal_email?: string;
    office_phone?: string;
    mobile_phone?: string;
    position?: string;
    description?: string;
    website?: string;
  }): Promise<void> {
    if (data.first_name) await this.firstNameInput.fill(data.first_name);
    if (data.last_name) await this.lastNameInput.fill(data.last_name);
    if (data.email) await this.emailInput.fill(data.email);
    if (data.personal_email) await this.personalEmailInput.fill(data.personal_email);
    if (data.office_phone) await this.officePhoneInput.fill(data.office_phone);
    if (data.mobile_phone) await this.mobilePhoneInput.fill(data.mobile_phone);
    if (data.position) await this.positionInput.fill(data.position);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.website) await this.websiteInput.fill(data.website);
  }

  async selectAssignedUser(name: string): Promise<void> {
    await this.page.getByRole("combobox").filter({ hasText: "Choose a user" }).click();
    await this.page.getByRole("option", { name }).click();
  }

  async selectAssignedAccount(name: string): Promise<void> {
    await this.page.getByRole("combobox", { name: "Assign an Account" }).click();
    await this.page.getByRole("option", { name }).click();
  }
}
