/**
 * Two simultaneous "send" calls on one campaign. DB-backed (CI integration job):
 * the conditional status write can only be proven on real Postgres. The first-step
 * check is held until every call reached it, so each one has already read the
 * campaign as sendable and none has written yet.
 */
const mockInngestSend = jest.fn();
jest.mock("@/inngest/client", () => ({
  inngest: {
    send: mockInngestSend,
    createFunction: jest.fn((_config: object, handler: object) => handler),
  },
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/authz", () => ({
  ...jest.requireActual("@/lib/authz"),
  requireRole: jest.fn(async () => ({ id: "admin", role: "admin" })),
  assertCanReadCampaign: jest.fn(async () => undefined),
}));
let mockAtFirstStep: () => Promise<void> = async () => undefined;
jest.mock("@/lib/campaigns/first-step", () => ({
  NO_FIRST_STEP_MESSAGE: "no step 0",
  campaignHasFirstStep: jest.fn(async () => {
    await mockAtFirstStep();
    return true;
  }),
}));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { sendCampaignNow } from "@/actions/campaigns/send-campaign-now";
import { campaignTools } from "@/lib/mcp/tools/campaigns";

const ADMIN = { id: "admin", role: "admin" };
const tag = randomUUID().slice(0, 8);
const campaignIds: string[] = [];

const runTool = (name: string, args: { id: string }) => {
  const tool = campaignTools.find((t) => t.name === name)!;
  return (tool.handler as unknown as (a: object, id: string, u: object) => Promise<unknown>)(args, ADMIN.id, ADMIN);
};

async function seedCampaign(status: string) {
  const id = randomUUID();
  campaignIds.push(id);
  await prismadb.crm_campaigns.create({ data: { id, v: 0, name: `so-${tag}`, status } });
  return id;
}

function holdAtFirstStepUntil(calls: number) {
  let arrived = 0;
  let open = () => {};
  const allArrived = new Promise<void>((resolve) => (open = resolve));
  mockAtFirstStep = async () => {
    if (++arrived === calls) open();
    await allArrived;
  };
}

const viaAction = async (id: string) => {
  const result = await sendCampaignNow(id);
  return result?.error ?? null;
};
const viaMcp = async (id: string) => {
  try {
    await runTool("campaigns_send", { id });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

beforeEach(() => {
  mockInngestSend.mockReset();
  mockInngestSend.mockResolvedValue({});
});

afterAll(async () => {
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: campaignIds } } });
  await prismadb.$disconnect();
});

describe("two simultaneous send calls emit campaigns/send-now once", () => {
  it.each([
    ["two UI actions on a draft", "draft", viaAction, viaAction],
    ["two MCP calls on a draft", "draft", viaMcp, viaMcp],
    ["a UI action and an MCP call on a scheduled campaign", "scheduled", viaAction, viaMcp],
  ])("%s", async (_label, status, first, second) => {
    const id = await seedCampaign(status);
    holdAtFirstStepUntil(2);

    const refusals = await Promise.all([first(id), second(id)]);

    expect(mockInngestSend).toHaveBeenCalledTimes(1);
    expect(refusals.filter((r) => r === null)).toHaveLength(1);
    expect(refusals.find((r) => r !== null)).toContain("Cannot send campaign in status: sending");
    const row = await prismadb.crm_campaigns.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe("sending");
  });
});
