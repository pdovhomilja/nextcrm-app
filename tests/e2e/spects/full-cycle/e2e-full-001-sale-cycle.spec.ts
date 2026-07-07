import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createContact } from "../../flows/contacts";
import { createContract } from "../../flows/contracts";
import { createOpportunity } from "../../flows/opportunities";
import { createProduct } from "../../flows/products";
import { unique } from "../../helpers/random";
import { AccountDetailPage, AccountListPage } from "../../pages/accounts";
import { SalesReportPage } from "../../pages/admin";
import { ContactDetailPage, ContactListPage } from "../../pages/contacts";
import { ContractListPage } from "../../pages/contracts";
import { OpportunityDetailPage, OpportunityListPage } from "../../pages/opportunities";
import { ProductListPage } from "../../pages/products";

test.describe("E2E-FULL-001: Ciclo de venta completo (Admin)", () => {
  test("crear cuenta, contacto, producto, oportunidad, contrato y verificar en reporte de ventas", async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Crear Account con datos completos
    const accountData = await createAccount(page, {
      name: unique("Enterprise Corp"),
      email: "contact@enterprise.com",
      website: "https://enterprise.com",
      annual_revenue: "1000000",
      billing_city: "Buenos Aires",
      billing_country: "Argentina",
    });

    // 2. Crear Contact vinculado a la Account
    const contactData = await createContact(page, {
      last_name: unique("Garcia"),
      assigned_account: accountData.name,
    });

    // 3. Crear Product
    const productData = await createProduct(page, {
      name: unique("Enterprise License"),
      sku: unique("ENT-SKU"),
      unit_price: "25000",
      currency: "USD",
      type: "PRODUCT",
    });

    // 4. Crear Opportunity vinculada a la Account
    const opportunityData = await createOpportunity(page, {
      name: unique("Big Deal E2E"),
      budget: "500000",
      currency: "USD",
    });

    // 5. Crear Contract
    const contractData = await createContract(page, {
      title: unique("Enterprise Agreement"),
      value: "500000",
      currency: "USD",
    });

    // 6. Verificar Account en el listado y detalle
    await AccountListPage.from(page).open();
    const accountList = await AccountListPage.create(page);
    await accountList.expectVisible(accountData.name);

    await accountList.clickRow(accountData.name);
    const accountDetail = await AccountDetailPage.create(page);
    await accountDetail.expectName(accountData.name);

    // 7. Verificar Contact vinculado
    await ContactListPage.from(page).open();
    const contactList = await ContactListPage.create(page);
    await contactList.search(contactData.last_name);
    await contactList.expectVisible(contactData.last_name);

    await contactList.clickRow(contactData.last_name);
    const contactDetail = await ContactDetailPage.create(page);
    await contactDetail.expectLinkedAccount(accountData.name);

    // 8. Verificar Product en el listado
    await ProductListPage.from(page).open();
    const productList = await ProductListPage.create(page);
    await productList.expectVisible(productData.name);

    // 9. Verificar Opportunity en el listado y detalle
    await OpportunityListPage.from(page).open();
    const oppList = await OpportunityListPage.create(page);
    await oppList.expectVisible(opportunityData.name);

    await oppList.clickRow(opportunityData.name);
    const oppDetail = await OpportunityDetailPage.create(page);
    await oppDetail.expectName(opportunityData.name);

    // 10. Verificar Contract en el listado
    await ContractListPage.from(page).open();
    const contractList = await ContractListPage.create(page);
    await contractList.expectVisible(contractData.title);

    // 11. Navegar a Reporte de Ventas y verificar KPIs
    const report = SalesReportPage.from(page);
    await report.open();
    await report.expectHeadingVisible();
    await report.expectKpiCardsVisible();
  });
});
