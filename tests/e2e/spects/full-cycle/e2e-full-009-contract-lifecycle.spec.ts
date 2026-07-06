import { test } from "../../fixtures/roles";
import { createContract } from "../../flows/contracts";
import { unique } from "../../helpers/random";
import { ContractFormPage, ContractListPage } from "../../pages/contracts";

test.describe("E2E-FULL-009: Contrato con lifecycle completo (Manager)", () => {
  test("manager crea, edita, elimina contrato y valida errores", async ({ managerPage }) => {
    test.setTimeout(60_000);

    // 1. Crear Contract
    const contractData = await createContract(managerPage, {
      title: unique("Manager Contract"),
      value: "150000",
      currency: "USD",
    });

    // 2. Verificar en el listado
    await ContractListPage.from(managerPage).open();
    const list = await ContractListPage.create(managerPage);
    await list.expectVisible(contractData.title);

    // 3. Editar Contract
    await list.clickRowMenu(contractData.title);
    await list.clickMenuItem("Update");
    const form = await ContractFormPage.create(managerPage);
    const editedTitle = unique("Manager Edited Contract");
    await form.fill({ title: editedTitle });
    await form.save();

    // 4. Verificar cambio
    await ContractListPage.from(managerPage).open();
    const listAfter = await ContractListPage.create(managerPage);
    await listAfter.expectVisible(editedTitle);

    // 5. Eliminar Contract
    await listAfter.clickRowMenu(editedTitle);
    await listAfter.clickDelete();
    await listAfter.confirmDelete();

    // Esperar a que el modal de confirmación se cierre
    await managerPage.locator("[role='dialog']").first().waitFor({ state: "hidden", timeout: 10_000 });

    // 6. Verificar que desaparece (navegar directamente para evitar cache)
    await managerPage.goto("/en/crm/contracts");
    await managerPage.waitForLoadState("networkidle");
    const listDeleted = await ContractListPage.create(managerPage);
    await listDeleted.expectNotVisible(editedTitle);

    // 7. Validar error con título de 2 caracteres
    await listDeleted.clickNew();
    const formNew = await ContractFormPage.create(managerPage);
    await formNew.fill({ title: "AB", currency: "USD" });
    await formNew.saveExpectError();
  });
});
