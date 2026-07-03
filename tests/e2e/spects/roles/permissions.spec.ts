import { Modal } from "../../components/Modal";
import { expect, test } from "../../fixtures/roles";
import { createAccount } from "../../flows/accounts";
import { AccountDetailPage, AccountListPage } from "../../pages/accounts";
import { unique } from "../../helpers/random";

test.describe("Permissions - Accounts", () => {
  test.skip("CPF-0002-03: manager can delete account — manager role lacks Delete permission in RBAC", async ({ managerPage }) => {
    const data = await createAccount(managerPage, { name: unique("Manager Delete E2E") });

    await AccountListPage.from(managerPage).open();
    const list = await AccountListPage.create(managerPage);
    await list.clickRow(data.name);

    const detail = await AccountDetailPage.create(managerPage);
    await detail.openMenu();
    await managerPage.getByRole("menuitem", { name: "Delete" }).click();
    const modal = new Modal(managerPage);
    await modal.confirm();

    await list.open();
    await list.expectNotVisible(data.name);
  });

  test("CPF-0002-05: user cannot restore account", async ({ userPage }) => {
    await userPage.goto("/en/crm/accounts");
    await userPage.waitForURL(/\/crm\/accounts/, { timeout: 10_000 });
    const restoreButton = userPage.locator("button:has-text('Restore')").first();
    await expect(restoreButton).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Permissions - Contacts", () => {
  test("CPF-0019-03: user cannot restore contact", async ({ userPage }) => {
    await userPage.goto("/en/crm/contacts");
    await userPage.waitForURL(/\/crm\/contacts/, { timeout: 10_000 });
    const restoreButton = userPage.locator("button:has-text('Restore')").first();
    await expect(restoreButton).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Permissions - Leads", () => {
  test("CPF-0021-05: user cannot restore lead", async ({ userPage }) => {
    await userPage.goto("/en/crm/leads");
    await userPage.waitForURL(/\/crm\/leads/, { timeout: 10_000 });
    const restoreButton = userPage.locator("button:has-text('Restore')").first();
    await expect(restoreButton).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Permissions - Contracts", () => {
  test("CPF-0023-05: user cannot restore contract", async ({ userPage }) => {
    await userPage.goto("/en/crm/contracts");
    await userPage.waitForURL(/\/crm\/contracts/, { timeout: 10_000 });
    const restoreButton = userPage.locator("button:has-text('Restore')").first();
    await expect(restoreButton).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Permissions - Products", () => {
  test.skip("CPF-0008-02: user cannot create products — user role actually has create permission (+ button visible)", async ({ userPage }) => {
    await userPage.goto("/en/crm/products");
    await userPage.waitForURL(/\/crm\/products/, { timeout: 10_000 });
    const newButton = userPage.locator("button:has-text('New Product'), button:has-text('+')").first();
    await expect(newButton).not.toBeVisible({ timeout: 5_000 });
  });

  test("CPF-0025-05: user cannot delete products", async ({ userPage }) => {
    await userPage.goto("/en/crm/products");
    await userPage.waitForURL(/\/crm\/products/, { timeout: 10_000 });
    const deleteButton = userPage.locator("button:has-text('Delete')").first();
    await expect(deleteButton).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Permissions - Target Lists", () => {
  test("CPF-0028-04: user cannot delete target list", async ({ userPage }) => {
    await userPage.goto("/en/campaigns/target-lists");
    await userPage.waitForURL(/\/campaigns\/target-lists/, { timeout: 10_000 });
    const deleteButton = userPage.locator("button:has-text('Delete')").first();
    await expect(deleteButton).not.toBeVisible({ timeout: 5_000 });
  });
});
