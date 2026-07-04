import { test } from "@playwright/test";
import { createTarget } from "../../flows/targets";
import { unique } from "../../helpers/random";
import { TargetFormPage, TargetListPage } from "../../pages/targets";

test.describe("Targets - CRUD", () => {
  test("PE-TG-001: crear target", async ({ page }) => {
    const data = await createTarget(page, {
      last_name: unique("Target E2E"),
      company: unique("TargetCorp E2E"),
    });

    const list = await TargetListPage.create(page);
    await list.expectVisible(data.last_name);
  });

  test("PE-TG-002: editar target", async ({ page }) => {
    const data = await createTarget(page, {
      last_name: unique("Target Edit E2E"),
      company: unique("TargetCorp Edit"),
    });

    const list = await TargetListPage.create(page);
    await list.expectVisible(data.last_name);

    await list.clickRowMenu(data.last_name);
    await list.clickMenuItem("Update");

    const form = await TargetFormPage.create(page);
    const editedName = unique("Target Editado");
    await form.fill({ last_name: editedName });
    await form.save();

    await list.open();
    await list.expectVisible(editedName);
  });

  test("PE-TG-003: eliminar target y verificar que desaparece de la lista", async ({ page }) => {
    const data = await createTarget(page, {
      last_name: unique("Target Delete E2E"),
      company: unique("TargetCorp Delete"),
    });

    const list = await TargetListPage.create(page);
    await list.expectVisible(data.last_name);
    await list.search(data.last_name);

    await list.clickRowMenu(data.last_name);
    await list.clickDelete();
    await list.confirmDelete();

    await list.open();
    await list.expectNotVisible(data.last_name);
  });
});

test.describe("Targets - Validaciones", () => {
  test("PE-TG-004: rechazar target sin last_name ni company", async ({ page }) => {
    await TargetListPage.from(page).open();
    const list = await TargetListPage.create(page);
    await list.clickNew();

    const form = await TargetFormPage.create(page);
    await form.fill({ last_name: "", company: "" });
    await form.saveExpectError();
    await form.expectError("last name");
  });
});
