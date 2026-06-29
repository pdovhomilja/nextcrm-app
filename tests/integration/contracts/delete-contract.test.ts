import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteContract } from "@/actions/crm/contracts/delete-contract";
import { getContract } from "@/actions/crm/get-contract";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContractSuiteContext, setupContractSuite, teardownContractSuite } from "../helpers/contracts";

describe("delete contract (soft delete)", () => {
  let ctx: ContractSuiteContext;

  beforeAll(async () => {
    ctx = await setupContractSuite("pict005");
    setSessionCookie(ctx.session.cookie);

    const result = await deleteContract({
      id: ctx.contract.id,
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe(ctx.contract.id);
  });

  afterAll(async () => {
    await teardownContractSuite(ctx);
  });

  it("sets deletedAt and deletedBy on the contract", {
    meta: {
      id: "PICT-011",
      endpoint: "Server Action: deleteContract",
      objective: "Validar que la eliminación lógica registre el momento y el usuario que realiza la baja del contrato",
      expectedStatus: "Fecha y usuario de eliminación registrados",
      params: { id: "ctx.contract.id" },
      notes: "Eliminación lógica exitosa"
    }
  }, async () => {
    const row = await prismadb.crm_Contracts.findUnique({
      where: { id: ctx.contract.id },
      select: { deletedAt: true, deletedBy: true },
    });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.deletedBy).toBe(ctx.ownerId);
  });

  it("excludes the deleted contract from getContract queries", {
    meta: {
      id: "PICT-012",
      endpoint: "Server Action: deleteContract",
      objective: "Verificar que el contrato eliminado lógicamente no pueda ser recuperado por consultas directas activas",
      expectedStatus: "Retorno nulo al buscar contrato eliminado",
      notes: "Validación de exclusión activa de contrato eliminado"
    }
  }, async () => {
    const contract = await getContract(ctx.contract.id);
    expect(contract).toBeNull();
  });

  it("writes an audit-log entry with action=deleted", {
    meta: {
      id: "PICT-013",
      endpoint: "Server Action: deleteContract",
      objective: "Validar que la eliminación lógica escriba un registro de auditoría con la acción de eliminado para el contrato",
      expectedStatus: "Entrada de auditoría creada con éxito",
      notes: "Auditoría de eliminación lógica"
    }
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "contract", entityId: ctx.contract.id, action: "deleted" },
      select: { id: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });
});
