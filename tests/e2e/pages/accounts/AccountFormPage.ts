import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class AccountFormPage extends BaseFormPage {
  static readonly urlPattern = /\/crm\/accounts\/(new|[a-f0-9-]+)/;

  static from(page: Page): AccountFormPage {
    return new AccountFormPage(page);
  }

  static async create(page: Page): Promise<AccountFormPage> {
    const instance = new AccountFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.nameInput = page.getByRole("textbox", { name: "Account name *" });
    this.emailInput = page.getByRole("textbox", { name: "E-mail" });
    this.websiteInput = page.getByRole("textbox", { name: "Website" });
    this.phoneInput = page.getByRole("textbox", { name: "Office phone" });
    this.descriptionInput = page.getByRole("textbox", { name: "Description" });
    this.annualRevenueInput = page.getByRole("textbox", { name: "Annual revenue" });
    this.billingStreetInput = page.getByRole("textbox", { name: "Billing street" });
    this.billingCityInput = page.getByRole("textbox", { name: "Billing City" });
    this.billingCountryInput = page.getByRole("textbox", { name: "Billing country" });
    this.submitButton = page.getByRole("button", { name: /Create account|Update account/ });
  }

  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly websiteInput: Locator;
  readonly phoneInput: Locator;
  readonly descriptionInput: Locator;
  readonly annualRevenueInput: Locator;
  readonly billingStreetInput: Locator;
  readonly billingCityInput: Locator;
  readonly billingCountryInput: Locator;
  readonly submitButton: Locator;

  async fill(data: {
    name?: string;
    email?: string;
    website?: string;
    phone?: string;
    description?: string;
    annual_revenue?: string;
    billing_street?: string;
    billing_city?: string;
    billing_country?: string;
  }): Promise<void> {
    if (data.name) await this.nameInput.fill(data.name);
    if (data.email) await this.emailInput.fill(data.email);
    if (data.website) await this.websiteInput.fill(data.website);
    if (data.phone) await this.phoneInput.fill(data.phone);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.annual_revenue) await this.annualRevenueInput.fill(data.annual_revenue);
    if (data.billing_street) await this.billingStreetInput.fill(data.billing_street);
    if (data.billing_city) await this.billingCityInput.fill(data.billing_city);
    if (data.billing_country) await this.billingCountryInput.fill(data.billing_country);
  }
}
