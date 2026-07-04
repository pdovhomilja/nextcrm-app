import { test } from "@playwright/test";
import { createTargetList } from "../../flows/target-lists";
import { unique } from "../../helpers/random";
import { TargetListListPage } from "../../pages/target-lists";

test.describe("Target Lists - CRUD", () => {
  test("PE-TL-001: crear lista de targets", async ({ page }) => {
    const data = await createTargetList(page, { name: unique("TargetList E2E") });

    const list = await TargetListListPage.create(page);
    await list.expectVisible(data.name);
  });

  test("PE-TL-003: eliminar lista de targets y verificar que desaparece", async ({ page }) => {
    const data = await createTargetList(page, { name: unique("TargetList Del E2E") });

    const list = await TargetListListPage.create(page);
    await list.expectVisible(data.name);

    await list.clickRowMenu(data.name);
    await list.clickDelete();
    await list.confirmDelete();

    await list.open();
    await list.expectNotVisible(data.name);
  });
});
