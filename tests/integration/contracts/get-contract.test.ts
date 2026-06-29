import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getContract } from "@/actions/crm/get-contract";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContractSuiteContext, setupContractSuite, teardownContractSuite } from "../helpers/contracts";

describe("get contract by id", () => {
  let ctx: ContractSuiteContext;
  let softDeletedId: string;

  beforeAll(async () => {
    ctx = await setupContractSuite("pict002");
    setSessionCookie(ctx.session.cookie);

    const ghost = await prismadb.crm_Contracts.create({
      data: {
        v: 0,
        title: "PICT-002 soft-deleted",
        createdBy: ctx.ownerId,
        updatedBy: ctx.ownerId,
        deletedAt: new Date(),
        deletedBy: ctx.ownerId,
        value: 0,
        account: ctx.account.id,
      },
      select: { id: true },
    });
    softDeletedId = ghost.id;
  });

  afterAll(async () => {
    await prismadb.crm_Contracts.delete({ where: { id: softDeletedId } });
    await teardownContractSuite(ctx);
  });

  it("returns the contract when it exists and is active", {
    meta: {
      id: "PICT-003",
      endpoint: "Server Action: getContract",
      objective:
        "Verificar que se retorne la información del contrato activo al solicitarlo por un identificador existente",
      expectedStatus: "Datos del contrato recuperados exitosamente",
      params: { id: "ctx.contract.id" },
      notes: "Recuperación exitosa de contrato activo",
    },
  }, async () => {
    const result = await getContract(ctx.contract.id);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(ctx.contract.id);
    expect(result?.title).toBe(ctx.contract.title);
  });

  it("returns null for a non-existent id", {
    meta: {
      id: "PICT-004",
      endpoint: "Server Action: getContract",
      objective:
        "Verificar que la acción de servidor retorne nulo al solicitar un contrato con un identificador inexistente",
      expectedStatus: "Retorno nulo",
      params: { id: "00000000-0000-0000-0000-000000000999" },
      notes: "Búsqueda de contrato inexistente",
    },
  }, async () => {
    const result = await getContract("00000000-0000-0000-0000-000000000999");
    expect(result).toBeNull();
  });

  it("returns null for a soft-deleted contract", {
    meta: {
      id: "PICT-005",
      endpoint: "Server Action: getContract",
      objective:
        "Verificar que la acción de servidor retorne nulo al solicitar un contrato que ha sido eliminado lógicamente",
      expectedStatus: "Retorno nulo",
      params: { id: "softDeletedId" },
      notes: "Exclusión de contratos eliminados lógicamente",
    },
  }, async () => {
    const result = await getContract(softDeletedId);
    expect(result).toBeNull();
  });
});
