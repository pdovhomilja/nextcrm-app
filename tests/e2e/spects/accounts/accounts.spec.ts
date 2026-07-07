import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { unique } from "../../helpers/random";
import { AccountDetailPage, AccountFormPage, AccountListPage } from "../../pages/accounts";

test.describe("Accounts - CRUD", () => {
  test("PE-A-001: crear cuenta con todos los campos y verificar status Active", async ({ page }) => {
    const accountName = unique("EmpresaTest");
    const data = await createAccount(page, {
      name: accountName,
      email: "contacto@empresatest.com",
      website: "https://empresatest.com",
      office_phone: "+541155551234",
      description: "Cuenta de prueba para E2E",
      annual_revenue: "500000",
      billing_street: "Av. Corrientes 1234",
      billing_city: "Buenos Aires",
      billing_country: "Argentina",
    });

    const list = await AccountListPage.create(page);
    await list.expectVisible(data.name);

    await list.clickRow(data.name);
    const detail = await AccountDetailPage.create(page);
    await detail.expectName(accountName);
    await detail.expectStatus("Active");
  });

  test("PE-A-002: editar cuenta existente y verificar cambio", async ({ page }) => {
    const data = await createAccount(page);
    const list = await AccountListPage.create(page);
    await list.search(data.name);
    await list.expectVisible(data.name);

    await list.clickRow(data.name);
    const detail = await AccountDetailPage.create(page);
    await detail.clickEdit();

    const form = await AccountFormPage.create(page);
    const editedName = unique("EmpresaEdit");
    await form.fill({ name: editedName });
    await form.save();

    await detail.waitForLoad();
    await detail.expectName(editedName);
  });

  test("PE-A-003: eliminar cuenta y verificar que desaparece de la lista", async ({ page }) => {
    const data = await createAccount(page, { name: unique("SoftDelete") });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickRowMenu(data.name);
    await list.clickDelete();
    await list.confirmDelete();

    await list.open();
    await list.expectNotVisible(data.name);

    await list.search(data.name);
    await list.expectNotVisible(data.name);
  });
});

test.describe("Accounts - Validaciones", () => {
  test("PE-A-004: rechazar name vacío", async ({ page }) => {
    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickNew();

    const form = await AccountFormPage.create(page);
    await form.saveExpectError();
    await form.expectError("expected string");
  });

  test("PE-A-005: rechazar email inválido", async ({ page }) => {
    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickNew();

    const form = await AccountFormPage.create(page);
    await form.fill({ name: "Test Account", email: "invalido" });
    await form.saveExpectError();
    await form.expectError("email");
  });

  test("PE-A-006: rechazar website inválido", async ({ page }) => {
    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickNew();

    const form = await AccountFormPage.create(page);
    await form.fill({ name: "Test Website", website: "no-es-url" });
    await form.saveExpectError();
    await form.expectError("url");
  });

  test("PE-A-007: rechazar name mayor a 100 caracteres", async ({ page }) => {
    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickNew();

    const form = await AccountFormPage.create(page);
    await form.fill({ name: "A".repeat(101) });
    await form.saveExpectError();
    await form.expectError("100");
  });

  test("PE-A-008: rechazar office_phone mayor a 50 caracteres", async ({ page }) => {
    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickNew();

    const form = await AccountFormPage.create(page);
    await form.fill({ name: "Test Phone", phone: "1".repeat(51) });
    await form.saveExpectError();
    await form.expectError("50");
  });

  test("PE-A-009: rechazar description mayor a 1000 caracteres", async ({ page }) => {
    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickNew();

    const form = await AccountFormPage.create(page);
    await form.fill({ name: "Test Desc", description: "A".repeat(1001) });
    await form.saveExpectError();
    await form.expectError("1000");
  });
});
