import type { Page } from "@playwright/test";
import { type ContactData, ContactFactory } from "../data/factories";
import { ContactFormPage, ContactListPage } from "../pages/contacts";

export async function createContact(page: Page, overrides?: Partial<ContactData>): Promise<ContactData> {
  const data = ContactFactory.build(overrides);

  await ContactListPage.from(page).open();
  const list = await ContactListPage.create(page);
  await list.clickNew();

  const form = await ContactFormPage.create(page);
  await form.fill(data);

  if (data.assigned_user) await form.selectAssignedUser(data.assigned_user);
  if (data.assigned_account) await form.selectAssignedAccount(data.assigned_account);

  await form.save();

  await ContactListPage.from(page).open();
  const listAfter = await ContactListPage.create(page);
  await listAfter.search(data.last_name);

  return data;
}
