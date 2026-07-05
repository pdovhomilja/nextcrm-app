import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createActivity } from "../../flows/activities";
import { unique } from "../../helpers/random";
import { AccountListPage } from "../../pages/accounts";
import { ActivityFeedPage, ActivityFormPage } from "../../pages/activities";

test.describe("Activities - CRUD", () => {
  test("PE-AC-001: crear actividad y verificar en feed", async ({ page }) => {
    const account = await createAccount(page, { name: unique("CuentaActivity") });
    const data = await createActivity(page, account.name, {
      title: unique("Actividad E2E"),
      type: "call",
      status: "Completed",
    });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickRow(account.name);

    const feed = ActivityFeedPage.create(page);
    await feed.expectActivityVisible(data.title);
  });
});

test.describe("Activities - Validaciones", () => {
  test("PE-AC-002: rechazar title vacío en actividad", async ({ page }) => {
    const account = await createAccount(page, { name: unique("Cuenta Activity Valid") });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickRow(account.name);

    const feed = ActivityFeedPage.create(page);
    await feed.clickLogActivity();

    const form = await ActivityFormPage.create(page);
    await form.fill({ title: " ", date: "2026-07-03T15:00" });
    await form.save();

    await feed.expectValidationError("Title is required");
  });
});
