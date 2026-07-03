import { test } from "@playwright/test";
import { createLead } from "../../flows/leads";
import { unique } from "../../helpers/random";
import { LeadDetailPage, LeadFormPage, LeadListPage } from "../../pages/leads";

test.describe("Leads - CRUD", () => {
  test("PELE-001: crear lead", async ({ page }) => {
    const data = await createLead(page, {
      last_name: unique("Martínez E2E"),
      email: "martinez@leadtest.com",
      company: "Lead Corp E2E",
    });

    const list = await LeadListPage.create(page);
    await list.expectVisible(data.last_name);
  });

  test("PELE-002: editar lead", async ({ page }) => {
    const data = await createLead(page);
    const list = await LeadListPage.create(page);

    await list.open();
    await list.clickRow(data.last_name);

    const detail = await LeadDetailPage.create(page);
    await detail.clickEdit();

    const form = await LeadFormPage.create(page);
    const editedName = unique("LMod");
    await form.fill({ last_name: editedName });
    await form.save();

    await detail.waitForLoad();
    await detail.expectName(editedName);
  });

  test("PELE-003: eliminar lead", async ({ page }) => {
    const deleteName = unique("LDel");
    const data = await createLead(page, { last_name: deleteName });
    const list = await LeadListPage.create(page);

    await list.expectVisible(data.last_name);

    await list.clickRowMenu(data.last_name);
    await list.clickDelete();
    await list.confirmDelete();

    await list.expectNotVisible(data.last_name);
  });
});

test.describe("Leads - Validaciones", () => {
  test("PELE-004: rechazar last_name vacío", async ({ page }) => {
    await LeadListPage.from(page).open();
    const list = await LeadListPage.create(page);
    await list.clickNew();

    const form = await LeadFormPage.create(page);
    await form.fill({ first_name: "Juan", last_name: "" });
    await form.saveExpectError();

    await form.expectError("Last name is required");
  });

  test("PELE-005: rechazar last_name mayor a 30 caracteres", async ({ page }) => {
    await LeadListPage.from(page).open();
    const list = await LeadListPage.create(page);
    await list.clickNew();

    const form = await LeadFormPage.create(page);
    await form.fill({ last_name: "A".repeat(31) });
    await form.saveExpectError();

    await form.expectError("30");
  });

  test("PELE-006: rechazar email inválido", async ({ page }) => {
    await LeadListPage.from(page).open();
    const list = await LeadListPage.create(page);
    await list.clickNew();

    const form = await LeadFormPage.create(page);
    await form.fill({ last_name: "Test Lead", email: "invalido" });
    await form.saveExpectError();

    await form.expectError("email");
  });

  test("PELE-007: rechazar phone mayor a 15 caracteres", async ({ page }) => {
    await LeadListPage.from(page).open();
    const list = await LeadListPage.create(page);
    await list.clickNew();

    const form = await LeadFormPage.create(page);
    await form.fill({ last_name: "Test Phone", phone: "1".repeat(16) });
    await form.saveExpectError();

    await form.expectError("15");
  });
});
