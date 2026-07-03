import type { Page } from "@playwright/test";
import { type AccountData, AccountFactory } from "../data/factories";
import { AccountFormPage, AccountListPage } from "../pages/accounts";

export async function createAccount(page: Page, overrides?: Partial<AccountData>): Promise<AccountData> {
  const data = AccountFactory.build(overrides);

  await AccountListPage.from(page).open();
  const list = await AccountListPage.create(page);
  await list.clickNew();

  const form = await AccountFormPage.create(page);
  await form.fill(data);
  await form.save();

  await AccountListPage.from(page).open();
  await AccountListPage.create(page);

  return data;
}

export async function deleteAccount(page: Page, name: string): Promise<void> {
  await AccountListPage.from(page).open();
  const list = await AccountListPage.create(page);
  await list.clickRowMenu(name);
  await list.clickDelete();
  await list.confirmDelete();
}
