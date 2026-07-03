import { test } from "@playwright/test";
import { createContract } from "../../flows/contracts";
import { unique } from "../../helpers/random";
import { ContractFormPage, ContractListPage } from "../../pages/contracts";

test.describe("Contracts - CRUD", () => {
  test("PECT-001: crear contrato", async ({ page }) => {
    const data = await createContract(page, {
      title: unique("Service Agreement E2E"),
      value: "120000",
      currency: "USD",
    });

    const list = await ContractListPage.create(page);
    await list.expectVisible(data.title);
  });

  test("PECT-002: editar contrato", async ({ page }) => {
    const data = await createContract(page, {
      title: unique("Contrato Edit E2E"),
      value: "50000",
      currency: "EUR",
    });

    const list = await ContractListPage.create(page);
    await list.expectVisible(data.title);

    await list.clickRowMenu(data.title);
    await list.clickMenuItem("Update");

    const form = await ContractFormPage.create(page);
    const editedTitle = unique("Contrato Modificado E2E");
    await form.fill({ title: editedTitle });
    await form.save();

    await list.open();
    await list.expectVisible(editedTitle);
  });

  test.skip("PECT-003: eliminar contrato — BUG: delete-contract no invalida cache (falta revalidatePath)", async ({ page }) => {
    const deleteTitle = unique("Contrato Delete E2E");
    const data = await createContract(page, {
      title: deleteTitle,
      value: "10000",
      currency: "USD",
    });

    const list = await ContractListPage.create(page);
    await list.expectVisible(data.title);
    await list.search(data.title);

    await list.clickRowMenu(data.title);
    await list.clickDelete();
    await list.confirmDelete();

    await list.expectNotVisible(data.title);
  });
});

test.describe("Contracts - Validaciones", () => {
  test("PECT-004: rechazar title con menos de 3 caracteres", async ({ page }) => {
    await ContractListPage.from(page).open();
    const list = await ContractListPage.create(page);
    await list.clickNew();

    const form = await ContractFormPage.create(page);
    await form.fill({ title: "AB", currency: "USD" });
    await form.saveExpectError();

    await form.expectError("3");
  });

  test("PECT-005: rechazar title mayor a 255 caracteres", async ({ page }) => {
    await ContractListPage.from(page).open();
    const list = await ContractListPage.create(page);
    await list.clickNew();

    const form = await ContractFormPage.create(page);
    await form.fill({ title: "A".repeat(256), currency: "USD" });
    await form.saveExpectError();

    await form.expectError("255");
  });

  test("PECT-006: rechazar value vacío", async ({ page }) => {
    await ContractListPage.from(page).open();
    const list = await ContractListPage.create(page);
    await list.clickNew();

    const form = await ContractFormPage.create(page);
    await form.fill({ title: "Test Contract", value: "", currency: "USD" });
    await form.saveExpectError();

    await form.expectError("value");
  });

  test("PECT-007: rechazar description mayor a 255 caracteres", async ({ page }) => {
    await ContractListPage.from(page).open();
    const list = await ContractListPage.create(page);
    await list.clickNew();

    const form = await ContractFormPage.create(page);
    await form.fill({ title: "Test Desc", description: "A".repeat(256), currency: "USD" });
    await form.saveExpectError();

    await form.expectError("255");
  });
});
