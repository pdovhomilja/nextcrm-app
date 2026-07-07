import { test } from "@playwright/test";
import { createOpportunity } from "../../flows/opportunities";
import { unique } from "../../helpers/random";
import { OpportunityFormPage, OpportunityListPage } from "../../pages/opportunities";

test.describe("Opportunities - CRUD", () => {
  test("PE-O-001: crear oportunidad", async ({ page }) => {
    const data = await createOpportunity(page, {
      name: unique("Deal E2E"),
      budget: "75000",
      currency: "USD",
    });

    const list = await OpportunityListPage.create(page);
    await list.expectVisible(data.name);
  });

  test("PE-O-002: editar oportunidad", async ({ page }) => {
    const data = await createOpportunity(page, {
      name: unique("Deal Edit E2E"),
      budget: "50000",
    });

    const list = await OpportunityListPage.create(page);
    await list.expectVisible(data.name);

    await list.clickRowMenu(data.name);
    await list.clickMenuItem("Update");

    const editedName = unique("Deal Modificado E2E");
    const form = await OpportunityFormPage.create(page);
    await form.fill({ name: editedName });
    await form.save();

    await list.open();
    await list.expectVisible(editedName);
  });

  test("PE-O-003: eliminar oportunidad", async ({ page }) => {
    const deleteName = unique("Deal Del E2E");
    const data = await createOpportunity(page, { name: deleteName });

    const list = await OpportunityListPage.create(page);
    await list.expectVisible(data.name);

    await list.clickRowMenu(data.name);
    await list.clickDelete();
    await list.confirmDelete();

    await list.open();
    await list.expectNotVisible(data.name);
  });
});

test.describe("Opportunities - Validaciones", () => {
  test("PE-O-004: rechazar name vacío", async ({ page }) => {
    await OpportunityListPage.from(page).open();
    const list = await OpportunityListPage.create(page);
    await list.clickNew();

    const form = await OpportunityFormPage.create(page);
    await form.fill({ name: "", budget: "10000" });
    await form.saveExpectError();
    await form.expectError("Opportunity name is required");
  });

  test("PE-O-005: rechazar close_date vacío", async ({ page }) => {
    await OpportunityListPage.from(page).open();
    const list = await OpportunityListPage.create(page);
    await list.clickNew();

    const form = await OpportunityFormPage.create(page);
    await form.fill({ name: "Deal Sin Fecha", budget: "10000" });
    await form.saveExpectError();
    await form.expectError("close date");
  });
});
