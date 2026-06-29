import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createNewContract } from "@/actions/crm/contracts/create-new-contract";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContractSuiteContext, setupContractSuite, teardownContractSuite } from "../helpers/contracts";

describe("create contract with valid data", () => {
  let ctx: ContractSuiteContext;
  let createdId: string | null = null;

  beforeAll(async () => {
    ctx = await setupContractSuite("pict001");
    setSessionCookie(ctx.session.cookie);

    const result = await createNewContract({
      title: "PICT-001 Test Contract",
      value: "15000.00",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "PICT-001 Description",
      account: ctx.account.id,
      assigned_to: ctx.ownerId,
      currency: "USD",
    });

    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.data?.title).toBe("PICT-001 Test Contract");

    const row = await prismadb.crm_Contracts.findFirst({
      where: { title: "PICT-001 Test Contract", account: ctx.account.id },
      select: { id: true },
    });
    createdId = row?.id ?? null;
  });

  afterAll(async () => {
    if (createdId) {
      await prismadb.crm_Contracts.delete({ where: { id: createdId } });
    }
    await teardownContractSuite(ctx);
  });

  it("successfully persists the contract row in crm_Contracts", {
    meta: {
      id: "PICT-001",
      endpoint: "Server Action: createNewContract",
      objective: "Validar que la acción de servidor persista el nuevo contrato correctamente en la base de datos con los valores provistos",
      expectedStatus: "Contrato persistido en crm_Contracts",
      body: { title: "PICT-001 Test Contract", value: "15000.00", account: "ctx.account.id", assigned_to: "ctx.ownerId", currency: "USD" },
      notes: "Persistencia correcta del contrato en la base de datos"
    }
  }, async () => {
    expect(createdId).toBeTruthy();
    const row = await prismadb.crm_Contracts.findUnique({
      where: { id: createdId ?? "" },
      select: { id: true, title: true, value: true, createdBy: true, account: true },
    });
    expect(row).not.toBeNull();
    expect(row?.title).toBe("PICT-001 Test Contract");
    expect(row?.account).toBe(ctx.account.id);
    expect(row?.createdBy).toBe(ctx.ownerId);
    expect(row?.value.toString()).toBe("15000");
  });

  it("creates an audit-log entry with action=created", {
    meta: {
      id: "PICT-002",
      endpoint: "Server Action: createNewContract",
      objective: "Validar que se registre una entrada en el registro de auditoría con la acción de creación correspondiente al contrato",
      expectedStatus: "Entrada de auditoría creada",
      notes: "Auditoría de creación de contrato"
    }
  }, async () => {
    expect(createdId).toBeTruthy();
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "contract", entityId: createdId ?? "", action: "created" },
      select: { id: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });
});
