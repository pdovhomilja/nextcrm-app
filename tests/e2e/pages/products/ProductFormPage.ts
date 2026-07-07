import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class ProductFormPage extends BaseFormPage {
  static readonly urlPattern = /\/crm\/products\/(new|[a-f0-9-]+)/;

  static from(page: Page): ProductFormPage {
    return new ProductFormPage(page);
  }

  static async create(page: Page): Promise<ProductFormPage> {
    const instance = new ProductFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.nameInput = page.locator("input[name='name'], #name").first();
    this.skuInput = page.locator("input[name='sku'], #sku").first();
    this.unitPriceInput = page.locator("input[name='unit_price'], #unit_price").first();
    this.submitButton = page.getByRole("button", { name: "Create" });
  }

  readonly nameInput: Locator;
  readonly skuInput: Locator;
  readonly unitPriceInput: Locator;
  readonly submitButton: Locator;

  async save(): Promise<void> {
    await this.submitButton.click();
    await this.page.getByRole("dialog").first().waitFor({ state: "hidden", timeout: 15_000 });
  }

  async fill(data: {
    name?: string;
    sku?: string;
    unit_price?: string;
    currency?: string;
    type?: string;
  }): Promise<void> {
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.sku) await this.skuInput.fill(data.sku);
    if (data.unit_price) await this.unitPriceInput.fill(data.unit_price);
    if (data.type) {
      const trigger = this.page.getByRole("dialog").locator("[name='type'] ~ button, button:has-text('Type')").first();
      await trigger.click();
      await this.page
        .getByRole("option", { name: new RegExp(data.type, "i") })
        .first()
        .click();
    }
    if (data.currency) {
      const trigger = this.page
        .getByRole("dialog")
        .locator("[name='currency'] ~ button, button:has-text('currency')")
        .first();
      await trigger.click();
      await this.page
        .getByRole("option", { name: new RegExp(data.currency, "i") })
        .first()
        .click();
    }
  }
}
