/**
 * A campaign moves from "sending" to "sent" once step 0 is finished: no step-0
 * send is still waiting to go out. DB-backed (CI integration job): runs the real
 * Inngest handlers against Postgres, with Resend and the email renderer mocked
 * and a fake `step` that JSON-round-trips results like Inngest.
 */
jest.mock("@/inngest/client", () => ({
  // Keep the options on the handler so tests can reach onFailure.
  inngest: { createFunction: jest.fn((config: object, handler: object) => Object.assign(handler, { config })) },
}));

const mockResendSend = jest.fn();
jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(async () => ({ emails: { send: mockResendSend } })),
}));
jest.mock("@/lib/campaigns/render-email", () => ({
  renderCampaignEmail: jest.fn(async () => "<html>rendered</html>"),
}));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { campaignSendStep } from "@/inngest/functions/campaigns/send-step";
import { campaignSendNow } from "@/inngest/functions/campaigns/send-now";
import { campaignScheduleSend } from "@/inngest/functions/campaigns/schedule-send";
import { campaignProcessFollowUp } from "@/inngest/functions/campaigns/process-follow-up";
import { markCampaignSentIfStep0Done } from "@/lib/campaigns/mark-campaign-sent";

type Handler = (ctx: { event: { data: Record<string, unknown> }; step: unknown }) => Promise<unknown>;

const tag = randomUUID().slice(0, 8);
const templateId = randomUUID();
const campaignIds: string[] = [];
const targetIds: string[] = [];

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

// One campaign with a step 0 and one queued step-0 send per recipient.
async function seed(status: string, recipients: Array<{ do_not_email?: boolean; unsubscribed?: boolean }>) {
  const campaignId = randomUUID();
  const stepId = randomUUID();
  campaignIds.push(campaignId);
  await prismadb.crm_campaigns.create({ data: { id: campaignId, v: 0, name: `ms-${tag}`, status } });
  await prismadb.crm_campaign_steps.create({
    data: { id: stepId, campaign_id: campaignId, order: 0, template_id: templateId, subject: "Hi" },
  });
  const sendIds: string[] = [];
  for (let i = 0; i < recipients.length; i++) {
    const targetId = randomUUID();
    targetIds.push(targetId);
    const email = `r${i}-${randomUUID().slice(0, 6)}@ms-${tag}.test`;
    await prismadb.crm_Targets.create({
      data: { id: targetId, last_name: `ms-${tag}`, email, do_not_email: recipients[i].do_not_email ?? false },
    });
    const send = await prismadb.crm_campaign_sends.create({
      data: {
        campaign_id: campaignId,
        step_id: stepId,
        target_id: targetId,
        email,
        unsubscribed_at: recipients[i].unsubscribed ? new Date() : null,
      },
    });
    sendIds.push(send.id);
  }
  return { campaignId, stepId, sendIds };
}

const runSendStep = (campaignId: string, sendId: string) =>
  (campaignSendStep as unknown as Handler)({ event: { data: { sendId, campaignId } }, step: fakeStep() });

// Inngest calls onFailure once the run has used up its retries, with the
// original event under event.data.event and the final error.
const runSendStepFailure = (campaignId: string, sendId: string, message: string) =>
  (campaignSendStep as unknown as { config: { onFailure: Handler } }).config.onFailure({
    event: { data: { event: { data: { sendId, campaignId } }, error: { name: "Error", message } } },
    error: new Error(message),
    step: fakeStep(),
  } as Parameters<Handler>[0]);

const send = (id: string) =>
  prismadb.crm_campaign_sends.findUniqueOrThrow({ where: { id }, select: { status: true, error_message: true } });

const campaign = (id: string) =>
  prismadb.crm_campaigns.findUniqueOrThrow({ where: { id }, select: { status: true, sent_at: true } });

beforeAll(async () => {
  await prismadb.crm_campaign_templates.create({
    data: { id: templateId, name: `ms-${tag}`, content_html: "<p>Hi</p>", content_json: {} },
  });
});

beforeEach(() => {
  mockResendSend.mockReset();
  mockResendSend.mockResolvedValue({ data: { id: `resend-${randomUUID()}` }, error: null });
});

afterAll(async () => {
  await prismadb.crm_campaign_sends.deleteMany({ where: { campaign_id: { in: campaignIds } } });
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: campaignIds } } });
  await prismadb.crm_Targets.deleteMany({ where: { id: { in: targetIds } } });
  await prismadb.crm_campaign_templates.deleteMany({ where: { id: templateId } });
  await prismadb.$disconnect();
});

describe("send-step marks the campaign sent when step 0 is finished", () => {
  it("stays sending while a step-0 send is queued, becomes sent after the last one", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}, {}]);

    await runSendStep(campaignId, sendIds[0]);
    expect((await campaign(campaignId)).status).toBe("sending");

    await runSendStep(campaignId, sendIds[1]);
    const after = await campaign(campaignId);
    expect(after.status).toBe("sent");
    expect(after.sent_at).toBeInstanceOf(Date);
  });

  // send-step skips these without touching the row, so it stays "queued".
  it.each([
    ["unsubscribed", { unsubscribed: true }],
    ["globally suppressed (do_not_email)", { do_not_email: true }],
  ])("a %s recipient whose send stays queued does not block the campaign", async (_label, skipped) => {
    const { campaignId, sendIds } = await seed("sending", [{}, skipped]);

    await runSendStep(campaignId, sendIds[0]);

    expect((await campaign(campaignId)).status).toBe("sent");
    expect(mockResendSend).toHaveBeenCalledTimes(1);
  });

  it("the skipped recipient being the last send to run still finishes the campaign", async () => {
    const { campaignId, sendIds } = await seed("sending", [{ unsubscribed: true }]);

    expect(await runSendStep(campaignId, sendIds[0])).toEqual({ skipped: true, reason: "recipient unsubscribed" });

    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("a failed send counts as finished", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    mockResendSend.mockResolvedValue({ data: null, error: { message: "boom" } });

    await runSendStep(campaignId, sendIds[0]);

    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("leaves a paused campaign paused even when nothing is waiting", async () => {
    const { campaignId, sendIds } = await seed("paused", [{ unsubscribed: true }]);
    await prismadb.crm_campaign_sends.update({ where: { id: sendIds[0] }, data: { status: "sent" } });

    expect(await runSendStep(campaignId, sendIds[0])).toEqual({ skipped: true, reason: "paused" });

    expect(await campaign(campaignId)).toEqual({ status: "paused", sent_at: null });
  });
});

describe("send-step run that fails after its retries", () => {
  it("marks the queued send failed and finishes the campaign when it was the last step-0 send", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    mockResendSend.mockRejectedValue(new Error("Resend 503"));
    await expect(runSendStep(campaignId, sendIds[0])).rejects.toThrow("Resend 503");
    expect(await send(sendIds[0])).toEqual({ status: "queued", error_message: null });

    await runSendStepFailure(campaignId, sendIds[0], "Resend 503");

    expect(await send(sendIds[0])).toEqual({ status: "failed", error_message: "Resend 503" });
    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("keeps the campaign sending while other step-0 sends are still queued", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}, {}]);

    await runSendStepFailure(campaignId, sendIds[0], "Resend 503");

    expect(await send(sendIds[0])).toEqual({ status: "failed", error_message: "Resend 503" });
    expect((await campaign(campaignId)).status).toBe("sending");
  });

  // A run that got as far as recording the send must not be overwritten.
  it("leaves a send that is already sent unchanged", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    await runSendStep(campaignId, sendIds[0]);
    expect(await send(sendIds[0])).toEqual({ status: "sent", error_message: null });

    await runSendStepFailure(campaignId, sendIds[0], "late failure");

    expect(await send(sendIds[0])).toEqual({ status: "sent", error_message: null });
  });
});

describe("a campaign with no recipients", () => {
  // No send record, so no send-step ever runs: the dispatching job must finish it.
  it("send-now marks it sent", async () => {
    const { campaignId } = await seed("sending", []);

    await (campaignSendNow as unknown as Handler)({ event: { data: { campaignId } }, step: fakeStep() });

    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("schedule-send marks it sent", async () => {
    const { campaignId } = await seed("scheduled", []);

    await (campaignScheduleSend as unknown as Handler)({
      event: { data: { campaignId, scheduledAt: "2002-01-01T00:00:00Z" } },
      step: fakeStep(),
    });

    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("send-now leaves a recipient's campaign sending until its send-step runs", async () => {
    const { campaignId } = await seed("sending", [{}]);

    await (campaignSendNow as unknown as Handler)({ event: { data: { campaignId } }, step: fakeStep() });

    expect((await campaign(campaignId)).status).toBe("sending");
  });
});

describe("follow-ups after the campaign is sent", () => {
  it("process-follow-up still dispatches the follow-up step on a sent campaign", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    await runSendStep(campaignId, sendIds[0]);
    expect((await campaign(campaignId)).status).toBe("sent");
    const followUpId = randomUUID();
    await prismadb.crm_campaign_steps.create({
      data: { id: followUpId, campaign_id: campaignId, order: 1, template_id: templateId, subject: "Again", delay_days: 3 },
    });
    const step = fakeStep();

    const result = await (campaignProcessFollowUp as unknown as Handler)({
      event: { data: { campaignId, stepId: followUpId, scheduledAt: "2002-01-01T00:00:00Z" } },
      step,
    });

    expect(result).toEqual({ dispatched: 1 });
    expect(step.sendEvent).toHaveBeenCalledWith("fan-out-follow-up-sends", [
      { name: "campaigns/send-step", data: { sendId: expect.any(String), campaignId } },
    ]);
  });
});

describe("markCampaignSentIfStep0Done write", () => {
  it("many send-steps finishing at once mark the campaign sent", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}, {}, {}, {}, {}, {}]);

    await Promise.all(sendIds.map((id) => runSendStep(campaignId, id)));

    expect((await campaign(campaignId)).status).toBe("sent");
  });

  // A pause or delete can land between send-step's campaign check and the write.
  it.each([
    ["paused", { status: "paused" }],
    ["deleted in the UI", { status: "deleted" }],
    ["deleted over MCP", { status: "sending", deletedAt: new Date() }],
  ])("never overwrites a campaign that was %s meanwhile", async (_label, data) => {
    const { campaignId } = await seed("sending", []);
    await prismadb.crm_campaigns.update({ where: { id: campaignId }, data });

    expect(await markCampaignSentIfStep0Done(campaignId)).toEqual({ marked: false });

    const after = await prismadb.crm_campaigns.findUniqueOrThrow({ where: { id: campaignId } });
    expect(after).toMatchObject({ status: data.status, sent_at: null });
  });
});
