// Runs the real campaign Inngest handlers (createFunction returns the handler)
// against a mocked prismadb and Resend, with a fake `step` that JSON-serialises
// step.run results the way Inngest does. The function config is kept on the
// handler as `.config` so the cancelOn wiring can be checked too.
jest.mock("@/inngest/client", () => ({
  inngest: {
    createFunction: jest.fn((config: unknown, handler: object) => Object.assign(handler, { config })),
  },
}));

const mockResendSend = jest.fn();
jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(async () => ({ emails: { send: mockResendSend } })),
}));

jest.mock("@/lib/campaigns/render-email", () => ({
  renderCampaignEmail: jest.fn(async () => "<html>rendered</html>"),
}));

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaigns: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    crm_campaign_steps: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    crm_TargetLists: { findMany: jest.fn() },
    crm_campaign_sends: { createMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { campaignScheduleSend } from "@/inngest/functions/campaigns/schedule-send";
import { campaignProcessFollowUp } from "@/inngest/functions/campaigns/process-follow-up";
import { campaignSendStep } from "@/inngest/functions/campaigns/send-step";
import { campaignSendNow } from "@/inngest/functions/campaigns/send-now";

type Handler = (ctx: { event: { data: Record<string, unknown> }; step: unknown }) => Promise<unknown>;

const db = prismadb as unknown as {
  crm_campaigns: Record<"findUnique" | "update" | "updateMany", jest.Mock>;
  crm_campaign_steps: Record<"findFirst" | "findUnique" | "findMany", jest.Mock>;
  crm_TargetLists: Record<"findMany", jest.Mock>;
  crm_campaign_sends: Record<"createMany" | "findMany" | "findUnique" | "update" | "updateMany" | "count", jest.Mock>;
};

function fakeStep() {
  return {
    sleepUntil: jest.fn(async () => undefined),
    sendEvent: jest.fn(async () => undefined),
    run: jest.fn(async (_name: string, fn: () => Promise<unknown>) => {
      const result = await fn();
      return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
    }),
  };
}

const NORMAL = { status: "sending", deletedAt: null };
const UI_DELETED = { status: "deleted", deletedAt: null };
const MCP_DELETED = { status: "sending", deletedAt: new Date("2026-11-01T10:00:00Z") };

const step0 = { id: "step-0", campaign_id: "camp-1", order: 0, delay_days: 0, send_to: null };
const followUp = { id: "step-1", campaign_id: "camp-1", order: 1, delay_days: 3, send_to: "all" };

function seedCampaign(campaign: { status: string; deletedAt: Date | null }, sendRecord: Record<string, unknown> = {}) {
  db.crm_campaigns.findUnique.mockResolvedValue({ ...campaign, target_lists: [] });
  db.crm_campaign_steps.findFirst.mockResolvedValue(step0);
  db.crm_campaign_steps.findUnique.mockResolvedValue(followUp);
  db.crm_campaign_steps.findMany.mockResolvedValue([]);
  db.crm_TargetLists.findMany.mockResolvedValue([
    { targets: [{ target: { id: "t-1", email: "a@example.com" } }] },
  ]);
  db.crm_campaign_sends.createMany.mockResolvedValue({ count: 1 });
  db.crm_campaign_sends.findMany.mockResolvedValue([
    { id: "send-1", target_id: "t-1", email: "a@example.com", unsubscribe_token: "tok" },
  ]);
  db.crm_campaign_sends.findUnique.mockResolvedValue({
    id: "send-1",
    email: "a@example.com",
    status: "queued",
    unsubscribed_at: null,
    unsubscribe_token: "tok",
    campaign: { ...campaign, from_name: null, reply_to: null },
    step: { subject: "Hi", template: { content_html: "<p>Hi</p>" } },
    target: { first_name: "A", last_name: "B", email: "a@example.com", company: null, position: null, do_not_email: false },
    ...sendRecord,
  });
  db.crm_campaign_sends.update.mockResolvedValue({});
  db.crm_campaign_sends.updateMany.mockResolvedValue({ count: 1 });
  db.crm_campaign_sends.count.mockResolvedValue(1);
  db.crm_campaigns.updateMany.mockResolvedValue({ count: 0 });
  mockResendSend.mockResolvedValue({ data: { id: "resend-1" }, error: null });
}

const jobs: Array<[string, Handler, Record<string, unknown>]> = [
  ["schedule-send", campaignScheduleSend as unknown as Handler, { campaignId: "camp-1", scheduledAt: "2026-11-02T08:00:00Z" }],
  ["process-follow-up", campaignProcessFollowUp as unknown as Handler, { campaignId: "camp-1", stepId: "step-1", scheduledAt: "2026-11-05T08:00:00Z" }],
  ["send-now", campaignSendNow as unknown as Handler, { campaignId: "camp-1" }],
];

describe("sleeping campaign jobs are cancelled when the campaign is deleted", () => {
  it.each([
    ["schedule-send", campaignScheduleSend],
    ["process-follow-up", campaignProcessFollowUp],
  ])("%s cancels on campaigns/deleted for the same campaignId", (_name, fn) => {
    expect((fn as unknown as { config: { cancelOn?: unknown[] } }).config.cancelOn).toContainEqual(
      { event: "campaigns/deleted", match: "data.campaignId" },
    );
  });

  // Rescheduling sends campaigns/schedule again; Inngest cancels the older
  // run on the same campaignId and keeps the new one.
  it("schedule-send cancels on a new campaigns/schedule for the same campaignId", () => {
    expect((campaignScheduleSend as unknown as { config: { cancelOn?: unknown[] } }).config.cancelOn).toContainEqual(
      { event: "campaigns/schedule", match: "data.campaignId" },
    );
  });

  // Send now on a scheduled campaign sends it at once: the run still sleeping
  // until the scheduled time must not send it again.
  it("schedule-send cancels on campaigns/send-now for the same campaignId", () => {
    expect((campaignScheduleSend as unknown as { config: { cancelOn?: unknown[] } }).config.cancelOn).toContainEqual(
      { event: "campaigns/send-now", match: "data.campaignId" },
    );
  });

  // Resume (campaigns/send-now) re-dispatches step 0 and every follow-up,
  // so sleeping runs from before the pause can go.
  it.each([
    ["schedule-send", campaignScheduleSend],
    ["process-follow-up", campaignProcessFollowUp],
  ])("%s cancels on campaigns/paused for the same campaignId", (_name, fn) => {
    expect((fn as unknown as { config: { cancelOn?: unknown[] } }).config.cancelOn).toContainEqual(
      { event: "campaigns/paused", match: "data.campaignId" },
    );
  });
});

describe("campaign jobs skip deleted campaigns", () => {
  beforeEach(() => jest.clearAllMocks());

  describe.each(jobs)("%s", (_name, handler, data) => {
    it.each([
      ["deleted in the UI (status deleted)", UI_DELETED],
      ["deleted over MCP (deletedAt set)", MCP_DELETED],
    ])("creates no send records and fans out nothing when %s", async (_label, campaign) => {
      seedCampaign(campaign);
      const step = fakeStep();

      const result = await handler({ event: { data }, step });

      expect(result).toEqual({ skipped: true, reason: "deleted" });
      expect(db.crm_campaign_sends.createMany).not.toHaveBeenCalled();
      expect(step.sendEvent).not.toHaveBeenCalled();
      expect(mockResendSend).not.toHaveBeenCalled();
    });
  });

  it.each([
    ["schedule-send", "fan-out-sends"],
    ["process-follow-up", "fan-out-follow-up-sends"],
    ["send-now", "fan-out-sends-now"],
  ])("%s still creates send records and fans out for a normal campaign", async (name, fanOutId) => {
    const [, handler, data] = jobs.find(([n]) => n === name)!;
    seedCampaign(NORMAL);
    // schedule-send goes on only once it moved a still-scheduled campaign to sending.
    if (name === "schedule-send") db.crm_campaigns.updateMany.mockResolvedValueOnce({ count: 1 });
    const step = fakeStep();

    await handler({ event: { data }, step });

    expect(db.crm_campaign_sends.createMany).toHaveBeenCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith(fanOutId, [
      { name: "campaigns/send-step", data: { sendId: "send-1", campaignId: "camp-1" } },
    ]);
  });

  describe("send-step (last gate before Resend)", () => {
    const run = (step: unknown) =>
      (campaignSendStep as unknown as Handler)({ event: { data: { sendId: "send-1", campaignId: "camp-1" } }, step });

    it.each([
      ["deleted in the UI (status deleted)", UI_DELETED],
      ["deleted over MCP (deletedAt set)", MCP_DELETED],
    ])("does not call Resend or touch the send record when %s", async (_label, campaign) => {
      seedCampaign(campaign);

      const result = await run(fakeStep());

      expect(result).toEqual({ skipped: true, reason: "deleted" });
      expect(mockResendSend).not.toHaveBeenCalled();
      expect(db.crm_campaign_sends.update).not.toHaveBeenCalled();
    });

    it("keeps skipping a paused campaign", async () => {
      seedCampaign({ status: "paused", deletedAt: null });

      expect(await run(fakeStep())).toEqual({ skipped: true, reason: "paused" });
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it.each([
      ["the send record was already sent", { status: "sent" }, "already sent"],
      [
        "the target globally opted out after fan-out",
        { target: { first_name: "A", last_name: "B", email: "a@example.com", company: null, position: null, do_not_email: true } },
        "recipient globally suppressed",
      ],
    ])("keeps skipping when %s", async (_label, sendRecord, reason) => {
      seedCampaign(NORMAL, sendRecord);

      expect(await run(fakeStep())).toEqual({ skipped: true, reason });
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it("sends a normal campaign through Resend and marks the record sent", async () => {
      seedCampaign(NORMAL);

      const result = await run(fakeStep());

      expect(result).toEqual({ sent: true });
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockResendSend.mock.calls[0][0]).toMatchObject({ to: "a@example.com", subject: "Hi" });
      expect(db.crm_campaign_sends.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "sent", resend_message_id: "resend-1" }) })
      );
    });
  });
});
