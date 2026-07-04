import { test } from "../../fixtures/roles";
import { PermissionsPage } from "../../pages/common";

test.describe("Permissions - Accounts", () => {
  test("PE-R-002: user cannot restore account", async ({ userPage }) => {
    const permissions = new PermissionsPage(userPage);
    await permissions.expectButtonNotVisible("/en/crm/accounts", "Restore");
  });
});

test.describe("Permissions - Contacts", () => {
  test("PE-R-003: user cannot restore contact", async ({ userPage }) => {
    const permissions = new PermissionsPage(userPage);
    await permissions.expectButtonNotVisible("/en/crm/contacts", "Restore");
  });
});

test.describe("Permissions - Leads", () => {
  test("PE-R-004: user cannot restore lead", async ({ userPage }) => {
    const permissions = new PermissionsPage(userPage);
    await permissions.expectButtonNotVisible("/en/crm/leads", "Restore");
  });
});

test.describe("Permissions - Contracts", () => {
  test("PE-R-005: user cannot restore contract", async ({ userPage }) => {
    const permissions = new PermissionsPage(userPage);
    await permissions.expectButtonNotVisible("/en/crm/contracts", "Restore");
  });
});

test.describe("Permissions - Products", () => {
  test("PE-R-007: user cannot delete products", async ({ userPage }) => {
    const permissions = new PermissionsPage(userPage);
    await permissions.expectButtonNotVisible("/en/crm/products", "Delete");
  });
});

test.describe("Permissions - Target Lists", () => {
  test("PE-R-008: user cannot delete target list", async ({ userPage }) => {
    const permissions = new PermissionsPage(userPage);
    await permissions.expectButtonNotVisible("/en/campaigns/target-lists", "Delete");
  });
});
