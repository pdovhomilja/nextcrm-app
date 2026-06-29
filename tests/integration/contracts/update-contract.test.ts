import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateContract } from "@/actions/crm/contracts/update-contract";
import { crm_Contracts_Status } from "@/actions/crm/contracts/update-contract/schema";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContractSuiteContext, setupContractSuite, teardownContractSuite } from "../helpers/contracts";

describe("update existing contract", () => {
  let ctx: ContractSuiteContext;
  const NEW_TITLE = "PICT-003 Updated Contract";
  const NEW_VALUE = "20000.00";

  beforeAll(async () => {
    ctx = await setupContractSuite("pict003");
    setSessionCookie(ctx.session.cookie);

    const result = await updateContract({
      id: ctx.contract.id,
      v: 0,
      title: NEW_TITLE,
      value: NEW_VALUE,
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "PICT-003 Updated Description",
      status: crm_Contracts_Status.INPROGRESS,
      account: ctx.account.id,
      assigned_to: ctx.ownerId,
      currency: "USD",
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.title).toBe(NEW_TITLE);
  });

  afterAll(async () => {
    await teardownContractSuite(ctx);
  });

  it("persists the new field values in database", {
    meta: {
      id: "PICT-006",
      endpoint: "Server Action: updateContract",
      objective: "Validar que la acción de servidor persista los nuevos valores modificados del contrato en la base de datos",
      expectedStatus: "Valores actualizados en base de datos",
      body: { id: "ctx.contract.id", title: "NEW_TITLE", value: "NEW_VALUE" },
      notes: "Persistencia correcta de cambios"
    }
  }, async () => {
    const row = await prismadb.crm_Contracts.findUnique({
      where: { id: ctx.contract.id },
      select: { title: true, value: true, updatedBy: true, status: true },
    });
    expect(row?.title).toBe(NEW_TITLE);
    expect(row?.value.toString()).toBe("20000");
    expect(row?.status).toBe("INPROGRESS");
  });

  it("writes an audit-log entry with action=updated and diff changes", {
    meta: {
      id: "PICT-007",
      endpoint: "Server Action: updateContract",
      objective: "Validar que la actualización del contrato genere un registro de auditoría detallando los cambios realizados en cada campo",
      expectedStatus: "Registro de auditoría generado con los cambios",
      notes: "Auditoría de actualización detallada"
    }
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "contract", entityId: ctx.contract.id, action: "updated" },
      orderBy: { createdAt: "desc" },
      select: { changes: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);

    const changes = log?.changes as { field: string; old: unknown; new: unknown }[] | null;
    expect(Array.isArray(changes)).toBe(true);
    const fields = (changes ?? []).map((c) => c.field);
    expect(fields).toContain("title");
    expect(fields).toContain("value");
    expect(fields).toContain("status");
  });
});
