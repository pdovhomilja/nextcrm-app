jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities_Sales_Stages: { findUnique: jest.fn() },
    crm_Opportunities: { findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/crm/funnel-settings", () => ({
  getFunnelSettings: jest.fn(),
}));

jest.mock("@/lib/crm/auto-task", () => ({
  createAutoTask: jest.fn(),
}));

import { prismadb } from "@/lib/prisma";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { createAutoTask } from "@/lib/crm/auto-task";
import { DEFAULT_FUNNEL_SETTINGS } from "@/lib/crm/funnel-timers";
import { qualifiedCadence } from "../qualified-cadence";

const findStage = prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock;
const findOpp = prismadb.crm_Opportunities.findUnique as jest.Mock;
const settings = getFunnelSettings as jest.Mock;
const createTask = createAutoTask as jest.Mock;

// The handler passed to inngest.createFunction (jest.mock above returns it verbatim).
const handler = qualifiedCadence as unknown as (args: {
  event: { ts: number; data: { record_id: string; to_stage: string } };
  step: {
    run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sleepUntil: (name: string, date: Date) => Promise<void>;
  };
}) => Promise<{ created?: number; skipped?: boolean }>;

const ENTRY = Date.parse("2026-11-02T09:00:00Z");

function run(recordId: string) {
  return handler({
    event: { ts: ENTRY, data: { record_id: recordId, to_stage: "stage-qualified" } },
    step: {
      run: (_name, fn) => fn(),
      sleepUntil: async () => {},
    },
  });
}

describe("crm-qualified-cadence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findStage.mockResolvedValue({ stage_kind: "qualified" });
    settings.mockResolvedValue(DEFAULT_FUNNEL_SETTINGS);
    createTask.mockResolvedValue({ id: "task-1" });
  });

  it("creates the cadence tasks for a live, non-deleted qualified deal", async () => {
    findOpp.mockResolvedValue({
      status: "ACTIVE",
      deletedAt: null,
      sales_stage: "stage-qualified",
      account: "acct-1",
      assigned_to: "user-1",
      name: "Deal A",
      assigned_sales_stage: { stage_kind: "qualified" },
    });

    const result = await run("opp-live");

    expect(createTask).toHaveBeenCalledTimes(5);
    expect(result).toEqual({ created: 5 });
  });

  it("creates no task for a soft-deleted deal that is still ACTIVE in a qualified stage", async () => {
    findOpp.mockResolvedValue({
      status: "ACTIVE",
      deletedAt: new Date("2026-11-03T12:00:00Z"),
      sales_stage: "stage-qualified",
      account: "acct-1",
      assigned_to: "user-1",
      name: "Deal B",
      assigned_sales_stage: { stage_kind: "qualified" },
    });

    const result = await run("opp-deleted");

    expect(createTask).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0 });
  });
});
