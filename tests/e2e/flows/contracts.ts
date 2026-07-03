import type { Page } from "@playwright/test";
import { type ContractData, ContractFactory } from "../data/factories";
import { ContractFormPage, ContractListPage } from "../pages/contracts";

export async function createContract(page: Page, overrides?: Partial<ContractData>): Promise<ContractData> {
  const data = ContractFactory.build(overrides);

  await ContractListPage.from(page).open();
  const list = await ContractListPage.create(page);
  await list.clickNew();

  const form = await ContractFormPage.create(page);
  await form.fill(data);
  await form.save();

  await ContractListPage.from(page).open();
  await ContractListPage.create(page);

  return data;
}
