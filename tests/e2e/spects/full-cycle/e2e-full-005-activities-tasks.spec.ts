import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createActivity } from "../../flows/activities";
import { createTask } from "../../flows/tasks";
import { unique } from "../../helpers/random";
import { AccountDetailPage, AccountListPage } from "../../pages/accounts";
import { ActivityFeedPage } from "../../pages/activities";

test.describe("E2E-FULL-005: Actividades y tareas en Account", () => {
  test("crear account, agregar actividad y tarea, y verificar en el feed", async ({ page }) => {
    test.setTimeout(60_000);

    const accountData = await createAccount(page, {
      name: unique("Activity Account"),
      email: "activity@accounttest.com",
    });

    const activityData = await createActivity(page, accountData.name, {
      title: unique("Call Activity"),
      type: "call",
      status: "Completed",
    });

    await AccountListPage.from(page).open();
    const accountList = await AccountListPage.create(page);
    await accountList.clickRow(accountData.name);
    await AccountDetailPage.create(page);

    const feed = ActivityFeedPage.create(page);
    await feed.expectActivityVisible(activityData.title);

    const _taskData = await createTask(page, accountData.name, {
      title: unique("Account Task"),
      content: "Tarea creada en account E2E",
      priority: "high",
    });

    await AccountListPage.from(page).open();
    const accountList2 = await AccountListPage.create(page);
    await accountList2.clickRow(accountData.name);
    const detail = await AccountDetailPage.create(page);
    await detail.expectName(accountData.name);
  });
});
