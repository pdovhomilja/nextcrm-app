jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { crmTargetTools } from "@/lib/mcp/tools/crm-targets";

const USER = "u1";
const TARGET_ID = "11111111-1111-1111-1111-111111111111";

const run = (name: string, args: any, userId = USER) => {
  const t = crmTargetTools.find((x) => x.name === name);
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

describe("crm_list_targets triage_status filter", () => {
  it("adds triage_status to the where clause when provided", async () => {
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_Targets.count as jest.Mock).mockResolvedValue(0);
    await run("crm_list_targets", { limit: 20, offset: 0, triage_status: "NEW" });
    const where = (prismadb.crm_Targets.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.triage_status).toBe("NEW");
    expect(where.created_by).toBe(USER);
  });

  it("omits the triage_status filter when not provided", async () => {
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_Targets.count as jest.Mock).mockResolvedValue(0);
    await run("crm_list_targets", { limit: 20, offset: 0 });
    const where = (prismadb.crm_Targets.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.triage_status).toBeUndefined();
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

  it("surfaces NOT_FOUND for a target the caller does not own", async () => {
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run("crm_set_target_triage", { id: TARGET_ID, status: "APPROVED" })
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });
});
