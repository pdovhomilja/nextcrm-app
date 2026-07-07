import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createContract } from "../../flows/contracts";
import { createOpportunity } from "../../flows/opportunities";
import { createProduct } from "../../flows/products";
import { unique } from "../../helpers/random";
import { SalesReportPage } from "../../pages/admin";

test.describe("E2E-FULL-015: Reporte de ventas con datos completos (Admin)", () => {
  test("crear datos completos y verificar en reporte de ventas", async ({ page }) => {
    test.setTimeout(60_000);

    const _accountData = await createAccount(page, {
      name: unique("Report Corp"),
      email: "report@corp.com",
      annual_revenue: "2000000",
    });

    const _productData = await createProduct(page, {
      name: unique("Report Product"),
      sku: unique("RPT-SKU"),
      unit_price: "50000",
      currency: "USD",
    });

    const _oppData = await createOpportunity(page, {
      name: unique("Report Deal"),
      budget: "750000",
      currency: "USD",
    });

    const _contractData = await createContract(page, {
      title: unique("Report Contract"),
      value: "750000",
      currency: "USD",
    });

    const report = SalesReportPage.from(page);
    await report.open();
    await report.expectHeadingVisible();
    await report.expectKpiCardsVisible();
  });
});
