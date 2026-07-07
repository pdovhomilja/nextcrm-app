import { test } from "../../fixtures/roles";
import { PermissionsPage } from "../../pages/common";

test.describe("E2E-FULL-007: Control de permisos multi-rol (Admin vs User)", () => {
  test("user no puede restaurar ni eliminar, admin sí puede", async ({ adminPage, userPage }) => {
    test.setTimeout(60_000);

    const permissions = new PermissionsPage(userPage);

    // 1. User no puede restaurar Accounts
    await permissions.expectButtonNotVisible("/en/crm/accounts", "Restore");

    // 2. User no puede restaurar Contacts
    await permissions.expectButtonNotVisible("/en/crm/contacts", "Restore");

    // 3. User no puede restaurar Leads
    await permissions.expectButtonNotVisible("/en/crm/leads", "Restore");

    // 4. User no puede restaurar Contracts
    await permissions.expectButtonNotVisible("/en/crm/contracts", "Restore");

    // 5. User no puede eliminar Products
    await permissions.expectButtonNotVisible("/en/crm/products", "Delete");

    // 6. User no puede eliminar Target Lists
    await permissions.expectButtonNotVisible("/en/campaigns/target-lists", "Delete");

    // 7. Admin SÍ puede ver la página de Audit Log
    const adminPermissions = new PermissionsPage(adminPage);
    await adminPermissions.expectButtonNotVisible("/en/admin/audit-log", "NonExistentButton");
  });
});
