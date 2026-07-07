import type { Page } from "@playwright/test";
import { type ActivityData, ActivityFactory } from "../data/factories";
import { AccountDetailPage, AccountListPage } from "../pages/accounts";
import { ActivityFeedPage, ActivityFormPage } from "../pages/activities";

export async function createActivity(
  page: Page,
  accountName: string,
  overrides?: Partial<ActivityData>,
): Promise<ActivityData> {
  const data = ActivityFactory.build(overrides);

  await AccountListPage.from(page).open();
  const list = await AccountListPage.create(page);
  await list.clickRow(accountName);

  await AccountDetailPage.create(page);
  const feed = ActivityFeedPage.create(page);
  await feed.clickLogActivity();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10_000 });

  const form = await ActivityFormPage.create(page);
  await form.fill(data);
  await form.save();

  return data;
}
