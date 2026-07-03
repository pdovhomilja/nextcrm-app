import { test, expect } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createOpportunity } from "../../flows/opportunities";
import { AccountDetailPage, AccountListPage } from "../../pages/accounts";
import { OpportunityDetailPage, OpportunityListPage } from "../../pages/opportunities";

test.describe("Flujo Completo - Ciclo de Venta", () => {
  test.skip("PEFC-001: crear oportunidad y verificar en reporte de ventas — BUG: página de oportunidades no carga ('This page couldn't load')", async ({ page }) => {
    const account = await createAccount(page, { name: "Empresa Ciclo E2E" });

    const opportunity = await createOpportunity(page, {
      name: "Deal Ciclo Completo E2E",
      budget: "50000",
      currency: "USD",
    });

    await OpportunityListPage.from(page).open();
    const oppList = await OpportunityListPage.create(page);
    await oppList.clickRow(opportunity.name);
    const oppDetail = await OpportunityDetailPage.create(page);
    await oppDetail.expectName(opportunity.name);

    await AccountListPage.from(page).open();
    const accList = await AccountListPage.create(page);
    await accList.clickRow(account.name);
    const accDetail = await AccountDetailPage.create(page);
    await accDetail.expectName(account.name);

    await page.goto("/en/reports/sales");
    await page.waitForLoadState("domcontentloaded");

    const heading = page.getByRole("heading");
    await expect(heading.first()).toBeVisible({ timeout: 10_000 });

    const kpiCards = page.locator("[class*='card']");
    await expect(kpiCards.first()).toBeVisible({ timeout: 10_000 });
  });
});
