import { test } from "../../fixtures/roles";
import { createAccount } from "../../flows/accounts";
import { createContract } from "../../flows/contracts";
import { unique } from "../../helpers/random";
import { AccountListPage } from "../../pages/accounts";
import { ContractListPage } from "../../pages/contracts";

test.describe("E2E-FULL-013: Colaboración multi-rol (Manager + User)", () => {
  test("manager crea account, admin crea contrato y ambos verifican", async ({ managerPage, adminPage }) => {
    test.setTimeout(60_000);

    // 1. (Manager) Crear Account
    const accountData = await createAccount(managerPage, {
      name: unique("Collab Account"),
      email: "collab@test.com",
    });

    // 2. (Manager) Verificar Account
    await AccountListPage.from(managerPage).open();
    const managerList = await AccountListPage.create(managerPage);
    await managerList.expectVisible(accountData.name);

    // 3. (Admin) Crear Contract
    const contractData = await createContract(adminPage, {
      title: unique("Admin Contract"),
      value: "100000",
      currency: "USD",
    });

    // 4. (Admin) Verificar Contract
    await ContractListPage.from(adminPage).open();
    const adminList = await ContractListPage.create(adminPage);
    await adminList.expectVisible(contractData.title);

    // 5. (Manager) Verificar que el Contract también es visible
    await ContractListPage.from(managerPage).open();
    const managerContractList = await ContractListPage.create(managerPage);
    await managerContractList.expectVisible(contractData.title);
  });
});
