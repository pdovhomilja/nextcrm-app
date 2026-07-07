import { test } from "../../fixtures/roles";
import { createContract } from "../../flows/contracts";
import { createOpportunity } from "../../flows/opportunities";
import { createProduct } from "../../flows/products";
import { unique } from "../../helpers/random";
import { ContractListPage } from "../../pages/contracts";
import { OpportunityListPage } from "../../pages/opportunities";
import { ProductListPage } from "../../pages/products";

test.describe("E2E-FULL-003: Pipeline de ventas con producto (Manager)", () => {
  test("manager crea producto, oportunidad, contrato y admin verifica visibilidad", async ({
    managerPage,
    adminPage,
  }) => {
    test.setTimeout(60_000);

    // 1. (Manager) Crear Product
    const productData = await createProduct(managerPage, {
      name: unique("Enterprise License"),
      sku: unique("MGR-SKU"),
      unit_price: "35000",
      currency: "USD",
      type: "PRODUCT",
    });

    // 2. (Manager) Crear Opportunity
    const opportunityData = await createOpportunity(managerPage, {
      name: unique("Manager Deal"),
      budget: "200000",
      currency: "USD",
    });

    // 3. (Manager) Crear Contract
    const contractData = await createContract(managerPage, {
      title: unique("Manager Contract"),
      value: "200000",
      currency: "USD",
    });

    // 4. (Manager) Verificar Product en el listado
    await ProductListPage.from(managerPage).open();
    const productList = await ProductListPage.create(managerPage);
    await productList.expectVisible(productData.name);

    // 5. (Manager) Verificar Opportunity en el listado
    await OpportunityListPage.from(managerPage).open();
    const oppList = await OpportunityListPage.create(managerPage);
    await oppList.expectVisible(opportunityData.name);

    // 6. (Manager) Verificar Contract en el listado
    await ContractListPage.from(managerPage).open();
    const contractList = await ContractListPage.create(managerPage);
    await contractList.expectVisible(contractData.title);

    // 7. (Admin) Verificar que todos los registros son visibles desde Admin
    await ProductListPage.from(adminPage).open();
    const adminProductList = await ProductListPage.create(adminPage);
    await adminProductList.expectVisible(productData.name);

    await OpportunityListPage.from(adminPage).open();
    const adminOppList = await OpportunityListPage.create(adminPage);
    await adminOppList.expectVisible(opportunityData.name);

    await ContractListPage.from(adminPage).open();
    const adminContractList = await ContractListPage.create(adminPage);
    await adminContractList.expectVisible(contractData.title);
  });
});
