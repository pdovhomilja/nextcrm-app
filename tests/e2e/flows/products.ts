import type { Page } from "@playwright/test";
import { type ProductData, ProductFactory } from "../data/factories";
import { ProductFormPage, ProductListPage } from "../pages/products";

export async function createProduct(page: Page, overrides?: Partial<ProductData>): Promise<ProductData> {
  const data = ProductFactory.build(overrides);

  await ProductListPage.from(page).open();
  const list = await ProductListPage.create(page);
  await list.clickNew();

  const form = await ProductFormPage.create(page);
  await form.fill(data);
  await form.save();

  await ProductListPage.from(page).open();
  await ProductListPage.create(page);

  return data;
}
