import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createContact } from "../../flows/contacts";
import { unique } from "../../helpers/random";
import { ContactDetailPage, ContactFormPage, ContactListPage } from "../../pages/contacts";

test.describe("Contacts - CRUD", () => {
  test("PECO-001: crear contacto vinculado a cuenta y verificar vínculo", async ({ page }) => {
    const accountData = await createAccount(page, { name: unique("CuentaContacto") });

    const contactData = await createContact(page, {
      last_name: unique("Garcia"),
      email: undefined,
      assigned_account: accountData.name,
    });

    const list = await ContactListPage.create(page);
    await list.expectVisible(contactData.last_name);

    await list.clickRow(contactData.last_name);
    const detail = await ContactDetailPage.create(page);
    await detail.expectLinkedAccount(accountData.name);
  });

  test("PECO-002: editar contacto existente", async ({ page }) => {
    const data = await createContact(page);
    const list = await ContactListPage.create(page);

    await list.expectVisible(data.last_name);
    await list.clickRow(data.last_name);

    const detail = await ContactDetailPage.create(page);
    await detail.clickEdit();

    const editedName = unique("PerezEdit");
    const form = await ContactFormPage.create(page);
    await form.fill({ last_name: editedName });
    await form.save();

    await detail.waitForLoad();
    await detail.expectName(editedName);
  });

  test("PECO-003: eliminar contacto desde lista", async ({ page }) => {
    const data = await createContact(page);
    const list = await ContactListPage.create(page);

    await list.expectVisible(data.last_name);
    await list.clickRowMenu(data.last_name);
    await list.clickDelete();
    await list.confirmDelete();

    await list.open();
    await list.expectNotVisible(data.last_name);
  });

  test("PECO-004: contacto eliminado no aparece en lista activa", async ({ page }) => {
    const data = await createContact(page);
    const list = await ContactListPage.create(page);

    await list.expectVisible(data.last_name);

    await list.clickRowMenu(data.last_name);
    await list.clickDelete();
    await list.confirmDelete();

    await list.open();
    await list.expectNotVisible(data.last_name);
  });
});

test.describe("Contacts - Validaciones", () => {
  test("PECO-006: rechazar last_name vacío", async ({ page }) => {
    await ContactListPage.from(page).open();
    const list = await ContactListPage.create(page);
    await list.clickNew();

    const form = await ContactFormPage.create(page);
    await form.fill({ first_name: "Juan", last_name: "" });
    await form.saveExpectError();

    await form.expectError("Last name");
  });

  test("PECO-007: rechazar email inválido", async ({ page }) => {
    await ContactListPage.from(page).open();
    const list = await ContactListPage.create(page);
    await list.clickNew();

    const form = await ContactFormPage.create(page);
    await form.fill({ last_name: "Test Contact", email: "invalido" });
    await form.saveExpectError();

    await form.expectError("email");
  });
});
