import type { Page } from "@playwright/test";
import { type TargetData, TargetFactory } from "../data/factories";
import { TargetFormPage, TargetListPage } from "../pages/targets";

export async function createTarget(page: Page, overrides?: Partial<TargetData>): Promise<TargetData> {
  const data = TargetFactory.build(overrides);

  await TargetListPage.from(page).open();
  const list = await TargetListPage.create(page);
  await list.clickNew();

  const form = await TargetFormPage.create(page);
  await form.fill(data);
  await form.save();

  await TargetListPage.from(page).open();
  await TargetListPage.create(page);

  return data;
}

export async function deleteTarget(page: Page, name: string): Promise<void> {
  await TargetListPage.from(page).open();
  const list = await TargetListPage.create(page);
  await list.clickRow(name);

  const detail = page.locator("button:has-text('Delete')").first();
  await detail.click();
  await page.locator("button:has-text('Delete')").last().click();
}
