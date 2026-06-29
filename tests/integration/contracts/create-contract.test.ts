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
      objective:
        "Validar que la acción de servidor persista el nuevo contrato correctamente en la base de datos con los valores provistos",
      expectedStatus: "Contrato persistido en crm_Contracts",
      body: {
        title: "PICT-001 Test Contract",
        value: "15000.00",
        account: "ctx.account.id",
        assigned_to: "ctx.ownerId",
        currency: "USD",
      },
      notes: "Persistencia correcta del contrato en la base de datos",
    },
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
      objective:
        "Validar que se registre una entrada en el registro de auditoría con la acción de creación correspondiente al contrato",
      expectedStatus: "Entrada de auditoría creada",
      notes: "Auditoría de creación de contrato",
    },
  }, async () => {
    expect(createdId).toBeTruthy();
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "contract", entityId: createdId ?? "", action: "created" },
      select: { id: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });

  it("rejects creation with non-numeric value (NaN Injection)", {
    meta: {
      id: "PICT-014",
      endpoint: "Server Action: createNewContract",
      objective: "Verificar que el sistema rechace montos de contrato no numéricos",
      expectedStatus: "Error de validación: monto no numérico",
      notes: "Error de formato: inyección de NaN",
    },
  }, async () => {
    const result = await createNewContract({
      title: "NaN Contract",
      value: "not-a-number",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "PICT-014 Description",
      account: ctx.account.id,
      assigned_to: ctx.ownerId,
      currency: "USD",
    });
    expect(result.error).toBeDefined();
  });

  it("rejects creation with currency length not equal to 3", {
    meta: {
      id: "PICT-015",
      endpoint: "Server Action: createNewContract",
      objective: "Verificar que el sistema rechace códigos de moneda que no posean exactamente 3 caracteres",
      expectedStatus: "Error de validación: longitud de moneda incorrecta",
      notes: "Error de formato: longitud de divisa",
    },
  }, async () => {
    const result = await createNewContract({
      title: "Currency Length Contract",
      value: "1000.00",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "PICT-015 Description",
      account: ctx.account.id,
      assigned_to: ctx.ownerId,
      currency: "US",
    });
    expect(result.error).toBeDefined();
  });

  it("rejects creation when endDate is before startDate", {
    meta: {
      id: "PICT-016",
      endpoint: "Server Action: createNewContract",
      objective: "Verificar que el sistema rechace fechas de fin anteriores al inicio",
      expectedStatus: "Error de validación: fecha de fin anterior al inicio",
      notes: "Violación de regla de negocio: fechas incoherentes",
    },
  }, async () => {
    const result = await createNewContract({
      title: "Dates Incoherent Contract",
      value: "1000.00",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-01-01"),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "PICT-016 Description",
      account: ctx.account.id,
      assigned_to: ctx.ownerId,
      currency: "USD",
    });
    expect(result.error).toBeDefined();
  });

  it("rejects creation with negative value", {
    meta: {
      id: "PICT-017",
      endpoint: "Server Action: createNewContract",
      objective: "Verificar que el sistema rechace la creación del contrato si el valor es negativo",
      expectedStatus: "Error de validación: valor negativo",
      notes: "Violación de regla de negocio: valor numérico negativo",
    },
  }, async () => {
    const result = await createNewContract({
      title: "Negative Contract",
      value: "-1000.00",
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "PICT-017 Description",
      account: ctx.account.id,
      assigned_to: ctx.ownerId,
      currency: "USD",
    });
    expect(result.error).toBeDefined();
  });
});
