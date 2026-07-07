import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addContractLineItem } from "@/actions/crm/contract-line-items/add-line-item";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContractSuiteContext, setupContractSuite, teardownContractSuite } from "../helpers/contracts";

describe("add line item to contract", () => {
  let ctx: ContractSuiteContext;
  let createdLineItemId: string | null = null;

  beforeAll(async () => {
    ctx = await setupContractSuite("pict004");
    setSessionCookie(ctx.session.cookie);

    const result = await addContractLineItem({
      contractId: ctx.contract.id,
      productId: ctx.product.id,
      name: "PICT-004 Line Item",
      sku: "SKU-PICT-004",
      description: "PICT-004 Line Item Desc",
      quantity: 2,
      unit_price: "150.00",
      discount_type: "PERCENTAGE",
      discount_value: "10.00",
      sort_order: 1,
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    createdLineItemId = result.data?.id ?? null;
  });

  afterAll(async () => {
    await teardownContractSuite(ctx);
  });

  it("persists the line item in crm_ContractLineItems with correct totals", {
    meta: {
      id: "PICT-008",
      endpoint: "Server Action: addContractLineItem",
      objective:
        "Validar que la acción de servidor registre correctamente la partida de contrato con los cálculos de totales correspondientes",
      expectedStatus: "Partida de contrato persistida con totales correctos",
      body: {
        contractId: "ctx.contract.id",
        productId: "ctx.product.id",
        quantity: 2,
        unit_price: "150.00",
        discount_type: "PERCENTAGE",
        discount_value: "10.00",
      },
      notes: "Persistencia correcta de partida de contrato",
    },
  }, async () => {
    expect(createdLineItemId).toBeTruthy();
    const item = await prismadb.crm_ContractLineItems.findUnique({
      where: { id: createdLineItemId ?? "" },
    });
    expect(item).not.toBeNull();
    expect(item?.contractId).toBe(ctx.contract.id);
    expect(item?.productId).toBe(ctx.product.id);
    expect(item?.quantity).toBe(2);
    expect(item?.unit_price.toString()).toBe("150");
    expect(item?.discount_type).toBe("PERCENTAGE");
    expect(item?.discount_value.toString()).toBe("10");
    expect(item?.line_total.toString()).toBe("270");
  });

  it("updates the parent contract value with the sum of line items", {
    meta: {
      id: "PICT-009",
      endpoint: "Server Action: addContractLineItem",
      objective:
        "Validar que la adición de una partida actualice de forma acumulativa el valor total del contrato padre",
      expectedStatus: "Valor total del contrato padre actualizado",
      notes: "Recalculo de valor total de contrato",
    },
  }, async () => {
    const parent = await prismadb.crm_Contracts.findUnique({
      where: { id: ctx.contract.id },
      select: { value: true },
    });
    expect(parent?.value.toString()).toBe("270");
  });

  it("writes an audit-log entry for the contract line item", {
    meta: {
      id: "PICT-010",
      endpoint: "Server Action: addContractLineItem",
      objective:
        "Validar que se registre una entrada en la auditoría con la acción de creación correspondiente a la partida de contrato",
      expectedStatus: "Entrada de auditoría creada para la partida de contrato",
      notes: "Auditoría de creación de partida de contrato",
    },
  }, async () => {
    expect(createdLineItemId).toBeTruthy();
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "contract_line_item", entityId: createdLineItemId ?? "", action: "created" },
      select: { id: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });
});
