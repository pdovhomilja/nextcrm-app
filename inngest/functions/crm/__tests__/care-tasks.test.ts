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
import { careTasks } from "../care-tasks";

const findStage = prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock;
const findOpp = prismadb.crm_Opportunities.findUnique as jest.Mock;
const settings = getFunnelSettings as jest.Mock;
const createTask = createAutoTask as jest.Mock;

// The handler passed to inngest.createFunction (jest.mock above returns it verbatim).
const handler = careTasks as unknown as (args: {
  event: { ts: number; data: { record_id: string; to_stage: string } };
  step: {
    run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sleepUntil: (name: string, date: Date) => Promise<void>;
  };
}) => Promise<{ created?: number; skipped?: boolean }>;

const ENTRY = Date.parse("2026-11-02T09:00:00Z");

function run(recordId: string) {
  return handler({
    event: { ts: ENTRY, data: { record_id: recordId, to_stage: "stage-care" } },
    step: {
      run: (_name, fn) => fn(),
      sleepUntil: async () => {},
    },
  });
}

describe("crm-care-tasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findStage.mockResolvedValue({ stage_kind: "care" });
    settings.mockResolvedValue(DEFAULT_FUNNEL_SETTINGS);
    createTask.mockResolvedValue({ id: "task-1" });
  });

  it("creates the care touchpoints for a live, non-deleted care deal", async () => {
    findOpp.mockResolvedValue({
      status: "ACTIVE",
      deletedAt: null,
      account: "acct-1",
      assigned_to: "user-1",
      name: "Client A",
      assigned_sales_stage: { stage_kind: "care" },
    });

    const result = await run("opp-live");

    // check-in + referral ask + careQuarterCount quarterly entries
    expect(createTask).toHaveBeenCalledTimes(2 + DEFAULT_FUNNEL_SETTINGS.careQuarterCount);
    expect(result).toEqual({ created: 2 + DEFAULT_FUNNEL_SETTINGS.careQuarterCount });
  });

  it("creates no task for a soft-deleted deal that is still ACTIVE in a care stage", async () => {
    findOpp.mockResolvedValue({
      status: "ACTIVE",
      deletedAt: new Date("2026-11-03T12:00:00Z"),
      account: "acct-1",
      assigned_to: "user-1",
      name: "Client B",
      assigned_sales_stage: { stage_kind: "care" },
    });

    const result = await run("opp-deleted");

    expect(createTask).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0 });
  });
});
