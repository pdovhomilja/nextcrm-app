import { test } from "@playwright/test";
import { TargetListFactory } from "../../data/factories";
import { unique } from "../../helpers/random";
import { TargetListFormPage, TargetListListPage } from "../../pages/target-lists";

test.describe("Target Lists - CRUD", () => {
  test("PETL-001: crear lista de targets", async ({ page }) => {
    const data = TargetListFactory.build({ name: unique("TgtLst") });

    await TargetListListPage.from(page).open();
    const list = await TargetListListPage.create(page);
    await list.clickNew();

    const form = await TargetListFormPage.create(page);
    await form.fill({ name: data.name });
    await form.save();

    await list.expectVisible(data.name);
  });

  test("PETL-002: eliminar lista", async ({ page }) => {
    const data = TargetListFactory.build({ name: unique("TgtLstDel") });

    await TargetListListPage.from(page).open();
    const list = await TargetListListPage.create(page);
    await list.clickNew();

    const form = await TargetListFormPage.create(page);
    await form.fill({ name: data.name });
    await form.save();

    await list.expectVisible(data.name);

    await list.clickRowMenu(data.name);
    await list.clickDelete();
    await list.confirmDelete();

    await list.open();
    await list.expectNotVisible(data.name);
  });
});
