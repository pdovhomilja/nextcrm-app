import type { Page } from "@playwright/test";
import { type OpportunityData, OpportunityFactory } from "../data/factories";
import { OpportunityFormPage, OpportunityListPage } from "../pages/opportunities";

export async function createOpportunity(page: Page, overrides?: Partial<OpportunityData>): Promise<OpportunityData> {
  const data = OpportunityFactory.build(overrides);

  await OpportunityListPage.from(page).open();
  const list = await OpportunityListPage.create(page);
  await list.clickNew();

  const form = await OpportunityFormPage.create(page);
  await form.fill(data);
  await form.save();

  return data;
}
