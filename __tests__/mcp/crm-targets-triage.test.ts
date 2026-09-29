jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/audit-log", () => ({
  writeAuditLog: jest.fn(),
  diffObjects: jest.fn(() => []),
}));

import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { crmTargetTools } from "@/lib/mcp/tools/crm-targets";
import { crmTargetTriageTools } from "@/lib/mcp/tools/crm-target-triage";
import { TARGET_FIELDS } from "@/lib/spreadsheet/target-fields";

const USER = "u1";
const TARGET_ID = "11111111-1111-1111-1111-111111111111";

// Triage tools live in their own fork-owned file; search both arrays.
const allTargetTools = [...crmTargetTools, ...crmTargetTriageTools];
const run = (name: string, args: any, userId = USER) => {
  const t = allTargetTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return (t.handler as any)(args, userId);
};

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
    id: TARGET_ID,
    created_by: USER,
    triage_status: "NEW",
  });
  (prismadb.crm_Targets.update as jest.Mock).mockImplementation(({ data }: any) => ({
    id: TARGET_ID,
    ...data,
  }));
});

describe("crm_list_targets_by_triage", () => {
  it("scopes the query by triage_status and the caller", async () => {
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_Targets.count as jest.Mock).mockResolvedValue(0);
    await run("crm_list_targets_by_triage", { triage_status: "NEW", limit: 20, offset: 0 });
    const where = (prismadb.crm_Targets.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.triage_status).toBe("NEW");
    expect(where.created_by).toBe(USER);
    expect(where.deletedAt).toBeNull();
  });

  it("leaves the upstream crm_list_targets tool unfiltered (additive: no core edit)", async () => {
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_Targets.count as jest.Mock).mockResolvedValue(0);
    await run("crm_list_targets", { limit: 20, offset: 0 });
    const where = (prismadb.crm_Targets.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.triage_status).toBeUndefined();
    expect(where).toEqual({ created_by: USER, deletedAt: null });
  });
});

describe("crm_create_target load fields (schema parity with CSV import)", () => {
  // Validate THROUGH the tool's Zod schema — that is where undeclared fields
  // are stripped, so this is the boundary the parity fix must survive. Calling
  // the handler directly would bypass it and pass even with a narrow schema.
  const createThroughSchema = (args: unknown) => {
    const tool = crmTargetTools.find((t) => t.name === "crm_create_target")!;
    const parsed = (tool.schema as any).parse(args);
    return (tool.handler as any)(parsed, USER);
  };

  it("keeps company_website, industry, city, and description through validation", async () => {
    await createThroughSchema({
      last_name: "KC Home Solutions",
      company: "KC Home Solutions",
      company_website: "https://kchomesolutions.example",
      industry: "Remodeling",
      city: "Olathe",
      description: "Homepage headline renders white-on-light-gray — unreadable.",
    });
    const data = (prismadb.crm_Targets.create as jest.Mock).mock.calls[0][0].data;
    expect(data.company_website).toBe("https://kchomesolutions.example");
    expect(data.industry).toBe("Remodeling");
    expect(data.city).toBe("Olathe");
    expect(data.description).toBe(
      "Homepage headline renders white-on-light-gray — unreadable."
    );
    expect(data.created_by).toBe(USER);
  });

  it.each(["crm_create_target", "crm_update_target"])(
    "%s accepts every CSV-importable field (no silent drift)",
    (toolName) => {
      const tool = crmTargetTools.find((t) => t.name === toolName)!;
      const shapeKeys = Object.keys((tool.schema as any).shape);
      for (const field of TARGET_FIELDS) {
        expect(shapeKeys).toContain(field.key);
      }
    }
  );
});

describe("company-only targets (fork: last_name optional)", () => {
  // Validate THROUGH the Zod schema — the relaxation lives there (last_name is
  // no longer required), so the handler must be reached via a real parse.
  const createThroughSchema = (args: unknown) => {
    const tool = crmTargetTools.find((t) => t.name === "crm_create_target")!;
    const parsed = (tool.schema as any).parse(args);
    return (tool.handler as any)(parsed, USER);
  };
  const updateThroughSchema = (args: unknown) => {
    const tool = crmTargetTools.find((t) => t.name === "crm_update_target")!;
    const parsed = (tool.schema as any).parse(args);
    return (tool.handler as any)(parsed, USER);
  };

  beforeEach(() => {
    (prismadb.crm_Targets.create as jest.Mock).mockImplementation(
      ({ data }: any) => ({ id: TARGET_ID, ...data })
    );
  });

  it('creates a company-only target (no last_name) and defaults the column to ""', async () => {
    await createThroughSchema({
      company: "Ball Event Center",
      industry: "Event / wedding venue",
    });
    const data = (prismadb.crm_Targets.create as jest.Mock).mock.calls[0][0].data;
    expect(data.company).toBe("Ball Event Center");
    expect(data.last_name).toBe("");
  });

  it("rejects a target with neither last_name nor company", async () => {
    // type defaults to COMPANY, so the type-aware guard demands a company name.
    await expect(
      createThroughSchema({ industry: "Event / wedding venue" })
    ).rejects.toThrow(/requires a company name/i);
    expect(prismadb.crm_Targets.create).not.toHaveBeenCalled();
  });

  it('allows blanking last_name back to "" on update (company-only correction)', async () => {
    // A schema-valid UUID (the shared TARGET_ID is only used by handler-direct
    // calls that skip Zod, so it isn't a strict-format UUID).
    await updateThroughSchema({
      id: "11111111-1111-4111-8111-111111111111",
      last_name: "",
    });
    const data = (prismadb.crm_Targets.update as jest.Mock).mock.calls[0][0].data;
    expect(data.last_name).toBe("");
  });
});

describe("crm_set_target_triage", () => {
  it("approving sets APPROVED and clears prior pass fields", async () => {
    await run("crm_set_target_triage", { id: TARGET_ID, status: "APPROVED" });
    const data = (prismadb.crm_Targets.update as jest.Mock).mock.calls[0][0].data;
    expect(data.triage_status).toBe("APPROVED");
    expect(data.pass_reason).toBeNull();
    expect(data.triaged_by).toBe(USER);
  });

  it("passing records the reason, note, and revisit date", async () => {
    await run("crm_set_target_triage", {
      id: TARGET_ID,
      status: "PASSED",
      pass_reason: "BAD_TIMING",
      pass_note: "Circle back after their busy season",
      revisit_at: "2027-01-15T00:00:00.000Z",
    });
    const data = (prismadb.crm_Targets.update as jest.Mock).mock.calls[0][0].data;
    expect(data.triage_status).toBe("PASSED");
    expect(data.pass_reason).toBe("BAD_TIMING");
    expect(data.revisit_at).toEqual(new Date("2027-01-15T00:00:00.000Z"));
  });

  it("rejects a PASSED decision without a reason", async () => {
    await expect(
      run("crm_set_target_triage", { id: TARGET_ID, status: "PASSED" })
    ).rejects.toThrow(/reason/i);
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });

  it("writes a target audit-log entry on success", async () => {
    await run("crm_set_target_triage", { id: TARGET_ID, status: "APPROVED" });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "target", entityId: TARGET_ID, action: "updated", userId: USER })
    );
  });

  it("surfaces NOT_FOUND for a target the caller does not own", async () => {
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run("crm_set_target_triage", { id: TARGET_ID, status: "APPROVED" })
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });
});
