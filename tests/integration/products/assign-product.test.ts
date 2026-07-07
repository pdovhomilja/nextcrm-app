import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assignProduct } from "@/actions/crm/account-products/assign-product";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

describe("assign product to account boundary failures", () => {
  let session: IntegrationSession;
  let accountId: string;
  let productId: string;
  let inactiveProductId: string;

  beforeAll(async () => {
    session = await signInAsAdmin();
    setSessionCookie(session.cookie);

    const account = await prismadb.crm_Accounts.create({
      data: {
        v: 0,
        name: "PIPR Account Test",
        createdBy: session.userId,
        updatedBy: session.userId,
      },
      select: { id: true },
    });
    accountId = account.id;

    const product = await prismadb.crm_Products.create({
      data: {
        name: "PIPR Product Active",
        type: "PRODUCT",
        unit_price: 100.0,
        currency: "USD",
        status: "ACTIVE",
        createdBy: session.userId,
        updatedBy: session.userId,
      },
      select: { id: true },
    });
    productId = product.id;

    const inactiveProduct = await prismadb.crm_Products.create({
      data: {
        name: "PIPR Product Inactive",
        type: "PRODUCT",
        unit_price: 50.0,
        currency: "USD",
        status: "DRAFT",
        createdBy: session.userId,
        updatedBy: session.userId,
      },
      select: { id: true },
    });
    inactiveProductId = inactiveProduct.id;
  });

  afterAll(async () => {
    await prismadb.crm_AccountProducts.deleteMany({
      where: { accountId },
    });

    await prismadb.crm_Products.deleteMany({
      where: { id: { in: [productId, inactiveProductId] } },
    });

    await prismadb.crm_Accounts.delete({
      where: { id: accountId },
    });
  });

  it("rejects assignment of an inactive product", {
    meta: {
      id: "PIPR-004",
      endpoint: "Server Action: assignProduct",
      objective: "Verificar que el sistema rechace asignar un producto que no se encuentra en estado ACTIVE",
      expectedStatus: "Error: Producto no activo",
      notes: "Error de integridad referencial: producto inactivo",
    },
  }, async () => {
    const result = await assignProduct({
      accountId,
      productId: inactiveProductId,
      quantity: 1,
      currency: "USD",
      status: "ACTIVE",
      start_date: new Date(),
    });
    expect(result.error).toBeDefined();
  });

  it("rejects duplicate active product assignments", {
    meta: {
      id: "PIPR-005",
      endpoint: "Server Action: assignProduct",
      objective: "Verificar que el sistema rechace asignar un producto que ya tiene una asignación activa",
      expectedStatus: "Error: producto ya asignado",
      notes: "Restricción de unicidad: asignación duplicada",
    },
  }, async () => {
    const firstResult = await assignProduct({
      accountId,
      productId,
      quantity: 1,
      currency: "USD",
      status: "ACTIVE",
      start_date: new Date(),
    });
    expect(firstResult.data?.id).toBeTruthy();

    const secondResult = await assignProduct({
      accountId,
      productId,
      quantity: 1,
      currency: "USD",
      status: "ACTIVE",
      start_date: new Date(),
    });
    expect(secondResult.error).toBeDefined();
  });
});
