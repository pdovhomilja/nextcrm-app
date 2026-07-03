import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { unique } from "../../helpers/random";
import { AccountDetailPage, AccountListPage } from "../../pages/accounts";
import { TaskFormPage } from "../../pages/tasks";

test.describe("Tasks - CRUD", () => {
  test("PETS-001: crear tarea CRM", async ({ page }) => {
    const account = await createAccount(page, { name: unique("CuentaTask") });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickRow(account.name);

    const detail = await AccountDetailPage.create(page);
    await detail.clickNewTask();

    const form = await TaskFormPage.create(page);
    await form.fill({
      title: "Tarea de prueba E2E",
      content: "Contenido de la tarea E2E",
      priority: "high",
      assignedTo: "Test User",
    });
    await form.save();
  });

  test("PETS-002: rechazar title con menos de 3 caracteres", async ({ page }) => {
    const account = await createAccount(page, { name: unique("CuentaTaskValid") });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickRow(account.name);

    const detail = await AccountDetailPage.create(page);
    await detail.clickNewTask();

    const form = await TaskFormPage.create(page);
    await form.fill({ title: "AB", content: "Contenido de la tarea E2E", priority: "high", assignedTo: "Test User" });
    await form.saveExpectError();

    await form.expectError("3");
  });
});
