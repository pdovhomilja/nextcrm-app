import { test, expect } from "@playwright/test";
import { Modal } from "../../components/Modal";
import { createAccount } from "../../flows/accounts";
import { AccountListPage } from "../../pages/accounts";
import { AuditLogPage } from "../../pages/admin";
import { unique } from "../../helpers/random";

test.describe("Borrado Lógico - Transversal", () => {
  test("PEAU-001: ciclo completo crear - eliminar cuenta", async ({ page }) => {
    const data = await createAccount(page, { name: unique("Soft Delete E2E") });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.expectVisible(data.name);

    await list.clickRowMenu(data.name);
    await list.clickDelete();
    const modal = new Modal(page);
    await modal.confirm();

    await list.open();
    await list.expectNotVisible(data.name);
  });
});

test.describe("Auditoría", () => {
  test("PEAU-002: verificar registro de auditoría al crear cuenta", async ({ page }) => {
    await createAccount(page, { name: unique("Audit Test E2E") });

    const auditPage = AuditLogPage.from(page);
    await auditPage.open();

    const accountCreatedRow = auditPage.table
      .locator("tr, [role='row']")
      .filter({ hasText: "Account" })
      .filter({ hasText: "created" })
      .first();
    await expect(accountCreatedRow).toBeVisible({ timeout: 10_000 });
  });
});
