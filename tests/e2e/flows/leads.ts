import type { Page } from "@playwright/test";
import { type LeadData, LeadFactory } from "../data/factories";
import { LeadFormPage, LeadListPage } from "../pages/leads";

export async function createLead(page: Page, overrides?: Partial<LeadData>): Promise<LeadData> {
  const data = LeadFactory.build(overrides);

  await LeadListPage.from(page).open();
  const list = await LeadListPage.create(page);
  await list.clickNew();

  const form = await LeadFormPage.create(page);
  await form.fill(data);
  await form.save();

  await LeadListPage.from(page).open();
  await LeadListPage.create(page);

  return data;
}
