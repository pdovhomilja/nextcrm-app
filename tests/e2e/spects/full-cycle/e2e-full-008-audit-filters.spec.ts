import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { unique } from "../../helpers/random";
import { AccountDetailPage, AccountFormPage, AccountListPage } from "../../pages/accounts";
import { AuditLogPage } from "../../pages/admin";

test.describe("E2E-FULL-008: Auditoría completa (Admin)", () => {
  test("crear, editar, eliminar account y verificar acciones en audit log", async ({ page }) => {
    test.setTimeout(60_000);

    const accountName = unique("Audit Full Test");

    const accountData = await createAccount(page, {
      name: accountName,
      email: "audit@fulltest.com",
    });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickRow(accountData.name);
    const detail = await AccountDetailPage.create(page);
    await detail.clickEdit();
    const form = await AccountFormPage.create(page);
    const editedName = unique("Audit Edited");
    await form.fill({ name: editedName });
    await form.save();

    await AccountListPage.from(page).open();
    const listAfter = await AccountListPage.create(page);
    await listAfter.clickRowMenu(editedName);
    await listAfter.clickDelete();
    await listAfter.confirmDelete();

    const auditPage = AuditLogPage.from(page);
    await auditPage.open();

    await auditPage.expectAccountCreated();

    await auditPage.clickRestoreFirst();

    await AccountListPage.from(page).open();
    const listRestored = await AccountListPage.create(page);
    await listRestored.expectVisible(editedName);
  });
});
