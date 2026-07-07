import { test } from "@playwright/test";
import { createContract } from "../../flows/contracts";
import { createOpportunity } from "../../flows/opportunities";
import { unique } from "../../helpers/random";
import { SalesReportPage } from "../../pages/admin";
import { ContractListPage } from "../../pages/contracts";
import { OpportunityDetailPage, OpportunityFormPage, OpportunityListPage } from "../../pages/opportunities";

test.describe("E2E-FULL-010: Oportunidad con lifecycle de estados (Admin)", () => {
  test("crear oportunidad, editar, crear contrato y verificar en reportes", async ({ page }) => {
    test.setTimeout(60_000);

    const oppData = await createOpportunity(page, {
      name: unique("Lifecycle Deal"),
      budget: "300000",
      currency: "USD",
    });

    await OpportunityListPage.from(page).open();
    const oppList = await OpportunityListPage.create(page);
    await oppList.clickRow(oppData.name);
    const oppDetail = await OpportunityDetailPage.create(page);
    await oppDetail.clickEdit();
    const form = await OpportunityFormPage.create(page);
    const editedName = unique("Lifecycle Edited Deal");
    await form.fill({ name: editedName });
    await form.save();

    await oppDetail.waitForLoad();
    await oppDetail.expectName(editedName);

    const contractData = await createContract(page, {
      title: unique("Lifecycle Contract"),
      value: "300000",
      currency: "USD",
    });

    await ContractListPage.from(page).open();
    const contractList = await ContractListPage.create(page);
    await contractList.expectVisible(contractData.title);

    const report = SalesReportPage.from(page);
    await report.open();
    await report.expectHeadingVisible();
    await report.expectKpiCardsVisible();
  });
});
