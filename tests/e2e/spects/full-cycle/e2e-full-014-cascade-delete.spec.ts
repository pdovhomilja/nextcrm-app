import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createActivity } from "../../flows/activities";
import { createContact } from "../../flows/contacts";
import { unique } from "../../helpers/random";
import { AccountListPage } from "../../pages/accounts";
import { AuditLogPage } from "../../pages/admin";

test.describe("E2E-FULL-014: Borrado en cascada lógico (Admin)", () => {
  test("crear account, contact y activity, eliminar account y verificar en audit", async ({ page }) => {
    test.setTimeout(60_000);

    const accountName = unique("Cascade Test");

    const accountData = await createAccount(page, {
      name: accountName,
      email: "cascade@test.com",
    });

    const _contactData = await createContact(page, {
      last_name: unique("Cascade Contact"),
      assigned_account: accountData.name,
    });

    const _activityData = await createActivity(page, accountData.name, {
      title: unique("Cascade Activity"),
      type: "meeting",
      status: "Scheduled",
    });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickRowMenu(accountData.name);
    await list.clickDelete();
    await list.confirmDelete();

    await AccountListPage.from(page).open();
    const listAfter = await AccountListPage.create(page);
    await listAfter.expectNotVisible(accountData.name);

    const auditPage = AuditLogPage.from(page);
    await auditPage.open();
    await auditPage.expectAccountCreated();
  });
});
