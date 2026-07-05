import type { Page } from "@playwright/test";
import { type TargetListData, TargetListFactory } from "../data/factories";
import { TargetListFormPage, TargetListListPage } from "../pages/target-lists";

export async function createTargetList(page: Page, overrides?: Partial<TargetListData>): Promise<TargetListData> {
  const data = TargetListFactory.build(overrides);

  await TargetListListPage.from(page).open();
  const list = await TargetListListPage.create(page);
  await list.clickNew();

  const form = await TargetListFormPage.create(page);
  await form.fill(data);
  await form.save();

  await TargetListListPage.from(page).open();
  await TargetListListPage.create(page);

  return data;
}

export async function deleteTargetList(page: Page, name: string): Promise<void> {
  await TargetListListPage.from(page).open();
  const list = await TargetListListPage.create(page);
  await list.clickRowMenu(name);
  await list.clickDelete();
  await list.confirmDelete();
}
