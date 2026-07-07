import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { unique } from "../../helpers/random";
import { AccountListPage } from "../../pages/accounts";
import { AuditLogPage } from "../../pages/admin";

test.describe("E2E-FULL-006: Borrado lógico y restauración (Admin)", () => {
  test("crear account, eliminar, verificar en audit log y restaurar", async ({ page }) => {
    test.setTimeout(60_000);

    const accountName = unique("SoftDelete Test");

    const accountData = await createAccount(page, {
      name: accountName,
      email: "softdelete@test.com",
    });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.expectVisible(accountData.name);

    await list.clickRowMenu(accountData.name);
    await list.clickDelete();
    await list.confirmDelete();

    await AccountListPage.from(page).open();
    const listAfter = await AccountListPage.create(page);
    await listAfter.expectNotVisible(accountData.name);

    const auditPage = AuditLogPage.from(page);
    await auditPage.open();

    await auditPage.clickRestoreFirst();

    await AccountListPage.from(page).open();
    const listRestored = await AccountListPage.create(page);
    await listRestored.expectVisible(accountData.name);
  });
});
