/**
 * A campaign moves from "sending" to "sent" once step 0 is finished: no step-0
 * send is still waiting to go out. DB-backed (CI integration job): runs the real
 * Inngest handlers against Postgres, with Resend and the email renderer mocked
 * and a fake `step` that JSON-round-trips results like Inngest.
 */
jest.mock("@/inngest/client", () => ({
  // Keep the options on the handler so tests can reach onFailure.
  inngest: { send: jest.fn(async () => ({})), createFunction: jest.fn((config: object, handler: object) => Object.assign(handler, { config })) },
}));

jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

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
import { eligibleFollowUpSendsWhere } from "@/lib/campaigns/recipient-filters";
import { campaignTools } from "@/lib/mcp/tools/campaigns";

type Handler = (ctx: { event: { data: Record<string, unknown> }; step: unknown }) => Promise<unknown>;

const tag = randomUUID().slice(0, 8);
const templateId = randomUUID();
const campaignIds: string[] = [];
const targetIds: string[] = [];
const listIds: string[] = [];

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
  await prismadb.crm_TargetLists.deleteMany({ where: { id: { in: listIds } } });
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
  it("marks a send that never got claimed failed", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);

    await runSendStepFailure(campaignId, sendIds[0], "db down");

    expect(await send(sendIds[0])).toEqual({ status: "failed", error_message: "db down" });
  });

  it("marks the claimed send failed and finishes the campaign when it was the last step-0 send", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    mockResendSend.mockRejectedValue(new Error("Resend 503"));
    await expect(runSendStep(campaignId, sendIds[0])).rejects.toThrow("Resend 503");
    expect(await send(sendIds[0])).toEqual({ status: "sending", error_message: null });

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

describe("resuming a paused campaign", () => {
  // A paused campaign whose step-0 sends already reached these statuses.
  async function seedPaused(statuses: string[]) {
    const seeded = await seed("paused", statuses.map(() => ({})));
    for (let i = 0; i < statuses.length; i++) {
      await prismadb.crm_campaign_sends.update({ where: { id: seeded.sendIds[i] }, data: { status: statuses[i] } });
    }
    return seeded;
  }

  // What campaigns_resume starts: the campaign back to sending, then send-now,
  // then one send-step per event send-now fans out.
  async function resume(campaignId: string) {
    await prismadb.crm_campaigns.update({ where: { id: campaignId }, data: { status: "sending" } });
    const step = fakeStep();
    await (campaignSendNow as unknown as Handler)({ event: { data: { campaignId } }, step });
    const calls = step.sendEvent.mock.calls as unknown as Array<[string, Array<{ data: { sendId: string } }>]>;
    const [, events] = calls.find(([name]) => name === "fan-out-sends-now")!;
    for (const e of events) await runSendStep(campaignId, e.data.sendId);
  }

  it.each(["sent", "delivered", "bounced"])("does not email a %s send again", async (status) => {
    const { campaignId, sendIds } = await seedPaused([status]);

    await resume(campaignId);

    expect(mockResendSend).not.toHaveBeenCalled();
    expect((await send(sendIds[0])).status).toBe(status);
  });

  it("the campaign reaches sent when every send is already finished", async () => {
    const { campaignId } = await seedPaused(["sent", "delivered", "bounced"]);

    await resume(campaignId);

    expect(mockResendSend).not.toHaveBeenCalled();
    const after = await campaign(campaignId);
    expect(after.status).toBe("sent");
    expect(after.sent_at).toBeInstanceOf(Date);
  });

  it("sends a queued send", async () => {
    const { campaignId, sendIds } = await seedPaused(["queued"]);

    await resume(campaignId);

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect((await send(sendIds[0])).status).toBe("sent");
    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("a failed send that succeeds on retry ends sent", async () => {
    const { campaignId, sendIds } = await seedPaused(["failed"]);

    await resume(campaignId);

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const row = await prismadb.crm_campaign_sends.findUniqueOrThrow({ where: { id: sendIds[0] } });
    expect(row.status).toBe("sent");
    expect(row.resend_message_id).toMatch(/^resend-/);
    expect(row.sent_at).toBeInstanceOf(Date);
    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("a failed send that fails again stays failed and still finishes the campaign", async () => {
    const { campaignId, sendIds } = await seedPaused(["failed"]);
    mockResendSend.mockResolvedValue({ data: null, error: { message: "still down" } });

    await resume(campaignId);

    expect(await send(sendIds[0])).toEqual({ status: "failed", error_message: "still down" });
    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("in a mixed campaign emails only the queued and failed recipients", async () => {
    const { campaignId, sendIds } = await seedPaused(["queued", "failed", "sent", "delivered", "bounced"]);
    const rows = await prismadb.crm_campaign_sends.findMany({
      where: { id: { in: sendIds.slice(0, 2) } },
      select: { email: true },
    });

    await resume(campaignId);

    const emailed = mockResendSend.mock.calls.map(([args]) => args.to).sort();
    expect(emailed).toEqual(rows.map((r) => r.email).sort());
    expect((await send(sendIds[3])).status).toBe("delivered");
    expect((await send(sendIds[4])).status).toBe("bounced");
    expect((await campaign(campaignId)).status).toBe("sent");
  });
});

describe("a follow-up step dispatched again by a resume", () => {
  it("emails only its queued and failed sends", async () => {
    const { campaignId, stepId, sendIds } = await seed("sending", [{}, {}, {}, {}]);
    await prismadb.crm_campaign_sends.updateMany({ where: { step_id: stepId }, data: { status: "delivered" } });
    const followUpId = randomUUID();
    await prismadb.crm_campaign_steps.create({
      data: { id: followUpId, campaign_id: campaignId, order: 1, template_id: templateId, subject: "Again", delay_days: 3 },
    });
    const step0 = await prismadb.crm_campaign_sends.findMany({ where: { id: { in: sendIds } } });
    const statuses = ["queued", "failed", "delivered", "bounced"];
    await prismadb.crm_campaign_sends.createMany({
      data: step0.map((s, i) => ({
        campaign_id: campaignId,
        step_id: followUpId,
        target_id: s.target_id,
        email: s.email,
        status: statuses[i],
      })),
    });
    const step = fakeStep();

    await (campaignProcessFollowUp as unknown as Handler)({
      event: { data: { campaignId, stepId: followUpId, scheduledAt: "2002-01-01T00:00:00Z" } },
      step,
    });
    const [, events] = step.sendEvent.mock.calls[0] as unknown as [string, Array<{ data: { sendId: string } }>];
    expect(events).toHaveLength(4);
    for (const e of events) await runSendStep(campaignId, e.data.sendId);

    expect(mockResendSend.mock.calls.map(([args]) => args.to).sort()).toEqual(
      [step0[0].email, step0[1].email].sort()
    );
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

// Holds every run after it loaded the row until all of them have, so each one
// saw the row as sendable before any of them could write to it.
function runOverlapping(campaignId: string, sendId: string, runs: number) {
  let loaded = 0;
  let open = () => {};
  const allLoaded = new Promise<void>((resolve) => (open = resolve));
  const step = () => {
    const base = fakeStep();
    return {
      ...base,
      run: async (name: string, fn: () => Promise<unknown>) => {
        const result = await base.run(name, fn);
        if (name === "load-send-record") {
          if (++loaded === runs) open();
          await allLoaded;
        }
        return result;
      },
    };
  };
  return Promise.all(
    Array.from({ length: runs }, () =>
      (campaignSendStep as unknown as Handler)({ event: { data: { sendId, campaignId } }, step: step() })
    )
  );
}

describe("overlapping send-step runs on one send", () => {
  it.each([2, 8])("%i runs on a queued send make one Resend call", async (runs) => {
    const { campaignId, sendIds } = await seed("sending", [{}]);

    await runOverlapping(campaignId, sendIds[0], runs);

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect((await send(sendIds[0])).status).toBe("sent");
    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("2 runs on a failed send being retried make one Resend call", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    await prismadb.crm_campaign_sends.update({ where: { id: sendIds[0] }, data: { status: "failed" } });

    await runOverlapping(campaignId, sendIds[0], 2);

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect((await send(sendIds[0])).status).toBe("sent");
  });
});

describe("a send claimed by a run, with its mail in flight", () => {
  it("gets no follow-up yet: only a step-0 send that landed is eligible", async () => {
    const { campaignId, stepId, sendIds } = await seed("sending", [{}]);
    await prismadb.crm_campaign_sends.update({ where: { id: sendIds[0] }, data: { status: "sending" } });

    const eligible = await prismadb.crm_campaign_sends.count({
      where: eligibleFollowUpSendsWhere(stepId, "all"),
    });

    expect(eligible).toBe(0);
  });

  it("keeps the campaign sending while another recipient's run finishes", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}, { unsubscribed: true }]);
    let statusInFlight;
    mockResendSend.mockImplementation(async () => {
      await runSendStep(campaignId, sendIds[1]);
      statusInFlight = (await campaign(campaignId)).status;
      return { data: { id: `resend-${randomUUID()}` }, error: null };
    });

    await runSendStep(campaignId, sendIds[0]);

    expect(statusInFlight).toBe("sending");
    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("a losing run that fails leaves one Resend call and a send recorded as sent", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    let statusDuringLoserFailure;
    mockResendSend.mockImplementation(async () => {
      // Winner's mail is in flight; the loser used up its retries (e.g. on a DB blip).
      await runSendStepFailure(campaignId, sendIds[0], "loser failed");
      statusDuringLoserFailure = (await send(sendIds[0])).status;
      return { data: { id: "resend-winner" }, error: null };
    });

    await runSendStep(campaignId, sendIds[0]);

    expect(statusDuringLoserFailure).toBe("failed");
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect((await send(sendIds[0])).status).toBe("sent");
    expect((await campaign(campaignId)).status).toBe("sent");
  });
});

describe("Resend idempotency key", () => {
  // Resend as documented: an accepted request is stored per key and replayed; a
  // failed one is not stored, so it can be retried with the same key.
  function fakeResend() {
    const accepted = new Map<string, string>();
    const mails: string[] = [];
    const respond = (_payload: unknown, options: { idempotencyKey: string }) => {
      const replay = accepted.get(options.idempotencyKey);
      if (replay) return { data: { id: replay }, error: null };
      const id = `resend-${randomUUID()}`;
      accepted.set(options.idempotencyKey, id);
      mails.push(id);
      return { data: { id }, error: null };
    };
    return { mails, respond };
  }

  // Inngest re-executes the handler on a step failure; finished steps are memoized.
  function memoizingStep() {
    const done = new Map<string, unknown>();
    const base = fakeStep();
    return {
      ...base,
      run: jest.fn(async (name: string, fn: () => Promise<unknown>) => {
        if (!done.has(name)) done.set(name, await base.run(name, fn));
        return done.get(name);
      }),
    };
  }

  const execute = (campaignId: string, sendId: string, step: unknown) =>
    (campaignSendStep as unknown as Handler)({ event: { data: { sendId, campaignId } }, step });

  it("a run retried after Resend accepted the mail but timed out sends one mail", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    const resend = fakeResend();
    mockResendSend
      .mockImplementationOnce(async (...args: Parameters<typeof resend.respond>) => {
        resend.respond(...args);
        throw new Error("timeout");
      })
      .mockImplementation(async (...args: Parameters<typeof resend.respond>) => resend.respond(...args));
    const step = memoizingStep();

    await expect(execute(campaignId, sendIds[0], step)).rejects.toThrow("timeout");
    await execute(campaignId, sendIds[0], step);

    expect(mockResendSend).toHaveBeenCalledTimes(2);
    expect(resend.mails).toHaveLength(1);
    const row = await prismadb.crm_campaign_sends.findUniqueOrThrow({ where: { id: sendIds[0] } });
    expect(row.status).toBe("sent");
    expect(row.resend_message_id).toBe(resend.mails[0]);
  });

  it("the first attempt still in flight at Resend makes the step retry instead of failing the send", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    mockResendSend.mockResolvedValueOnce({
      data: null,
      error: { name: "concurrent_idempotent_requests", statusCode: 409, message: "in progress" },
    });
    const step = memoizingStep();

    await expect(execute(campaignId, sendIds[0], step)).rejects.toThrow("in progress");
    expect((await send(sendIds[0])).status).toBe("sending");

    await execute(campaignId, sendIds[0], step);
    expect((await send(sendIds[0])).status).toBe("sent");
  });

  it("a send Resend refused can be retried with the same key on a resume", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    const keys: string[] = [];
    mockResendSend
      .mockImplementationOnce(async (_payload: unknown, options: { idempotencyKey: string }) => {
        keys.push(options.idempotencyKey);
        return { data: null, error: { name: "rate_limit_exceeded", statusCode: 429, message: "slow down" } };
      })
      .mockImplementationOnce(async (_payload: unknown, options: { idempotencyKey: string }) => {
        keys.push(options.idempotencyKey);
        return { data: { id: "resend-retry" }, error: null };
      });

    await runSendStep(campaignId, sendIds[0]);
    expect(await send(sendIds[0])).toEqual({ status: "failed", error_message: "slow down" });

    await runSendStep(campaignId, sendIds[0]);
    expect((await send(sendIds[0])).status).toBe("sent");
    expect(keys).toEqual([`campaign-send/${sendIds[0]}`, `campaign-send/${sendIds[0]}`]);
  });
});

describe("a send stuck in sending: its run died holding the claim (cancelled, no onFailure)", () => {
  const MANAGER = { id: "m1", role: "manager" };
  const pauseAndResume = async (campaignId: string) => {
    await prismadb.crm_campaigns.update({ where: { id: campaignId }, data: { status: "paused" } });
    const resume = campaignTools.find((t) => t.name === "campaigns_resume")!;
    await (resume.handler as unknown as (a: object, id: string, u: object) => Promise<unknown>)(
      { id: campaignId },
      MANAGER.id,
      MANAGER
    );
  };
  const seedStuck = async () => {
    const seeded = await seed("sending", [{}]);
    await prismadb.crm_campaign_sends.update({ where: { id: seeded.sendIds[0] }, data: { status: "sending" } });
    return seeded;
  };

  it("keeps the campaign sending and a new run does not email it", async () => {
    const { campaignId, sendIds } = await seedStuck();

    const result = await runSendStep(campaignId, sendIds[0]);

    expect(result).toEqual({ skipped: true, reason: "already sending" });
    expect(mockResendSend).not.toHaveBeenCalled();
    expect((await campaign(campaignId)).status).toBe("sending");
  });

  it("pause and resume sends it and finishes the campaign", async () => {
    const { campaignId, sendIds } = await seedStuck();

    await pauseAndResume(campaignId);
    await runSendStep(campaignId, sendIds[0]);

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect((await send(sendIds[0])).status).toBe("sent");
    expect((await campaign(campaignId)).status).toBe("sent");
  });

  it("resume does not touch a send of another campaign", async () => {
    const stuck = await seedStuck();
    const other = await seedStuck();

    await pauseAndResume(stuck.campaignId);

    expect((await send(other.sendIds[0])).status).toBe("sending");
  });

  it("a resume while the mail is really in flight still sends one mail: the key stops the second", async () => {
    const { campaignId, sendIds } = await seed("sending", [{}]);
    let inFlight = false;
    let mails = 0;
    mockResendSend.mockImplementation(async () => {
      if (inFlight) {
        return { data: null, error: { name: "concurrent_idempotent_requests", statusCode: 409, message: "in progress" } };
      }
      inFlight = true;
      mails++;
      await pauseAndResume(campaignId);
      await expect(runSendStep(campaignId, sendIds[0])).rejects.toThrow("in progress");
      return { data: { id: "resend-first" }, error: null };
    });

    await runSendStep(campaignId, sendIds[0]);

    expect(mails).toBe(1);
    expect((await send(sendIds[0])).status).toBe("sent");
  });
});

describe("the schedule-send run of a campaign that was sent early", () => {
  // The campaign's target list: the recipients of its step-0 sends plus one
  // added later, which only a run that should not happen would pick up.
  async function linkList(campaignId: string, sendIds: string[]) {
    const listId = randomUUID();
    listIds.push(listId);
    await prismadb.crm_TargetLists.create({ data: { id: listId, name: `ms-${tag}` } });
    await prismadb.campaignToTargetLists.create({ data: { campaign_id: campaignId, target_list_id: listId } });
    const sends = await prismadb.crm_campaign_sends.findMany({ where: { id: { in: sendIds } }, select: { target_id: true } });
    const lateId = randomUUID();
    targetIds.push(lateId);
    await prismadb.crm_Targets.create({ data: { id: lateId, last_name: `ms-${tag}`, email: `late-${lateId.slice(0, 6)}@ms-${tag}.test` } });
    for (const id of [...sends.map((s) => s.target_id), lateId]) {
      await prismadb.targetsToTargetLists.create({ data: { target_id: id, target_list_id: listId } });
    }
  }

  const runScheduleSend = (campaignId: string, step: ReturnType<typeof fakeStep>) =>
    (campaignScheduleSend as unknown as Handler)({
      event: { data: { campaignId, scheduledAt: "2002-01-01T00:00:00Z" } },
      step,
    });

  // Covers a missed or late campaigns/send-now cancel: the woken run itself
  // must see that the campaign is no longer scheduled.
  it.each(["sending", "sent"])("does nothing when the campaign is already %s", async (status) => {
    const { campaignId, sendIds } = await seed(status, [{}]);
    await prismadb.crm_campaign_sends.update({ where: { id: sendIds[0] }, data: { status: "sent" } });
    const sentAt = new Date("2002-01-01T10:00:00Z");
    await prismadb.crm_campaigns.update({ where: { id: campaignId }, data: { sent_at: status === "sent" ? sentAt : null } });
    await linkList(campaignId, sendIds);
    const step = fakeStep();

    expect(await runScheduleSend(campaignId, step)).toEqual({ skipped: true, reason: status });

    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(await prismadb.crm_campaign_sends.count({ where: { campaign_id: campaignId } })).toBe(1);
    expect(await campaign(campaignId)).toEqual({ status, sent_at: status === "sent" ? sentAt : null });
  });

  it("a scheduled campaign nobody touched still goes out at its time", async () => {
    const { campaignId, sendIds } = await seed("scheduled", [{}]);
    await linkList(campaignId, sendIds);
    const step = fakeStep();

    expect(await runScheduleSend(campaignId, step)).toEqual({ dispatched: 2 });

    expect((await campaign(campaignId)).status).toBe("sending");
    expect(step.sendEvent).toHaveBeenCalledWith("fan-out-sends", expect.arrayContaining([
      { name: "campaigns/send-step", data: { sendId: sendIds[0], campaignId } },
    ]));
  });
});

describe("step 0 of a campaign that can still send (MCP step tools)", () => {
  const MANAGER = { id: "m1", role: "manager" };
  const callTool = (name: string, args: object) =>
    (campaignTools.find((t) => t.name === name)!.handler as unknown as (a: object, id: string, u: object) => Promise<unknown>)(
      args,
      MANAGER.id,
      MANAGER
    );
  const stepExists = async (id: string) => (await prismadb.crm_campaign_steps.count({ where: { id } })) === 1;

  it.each(["scheduled", "sending", "paused", "sent"])("refuses to delete step 0 of a %s campaign", async (status) => {
    const { stepId } = await seed(status, []);
    await expect(callTool("campaigns_delete_step", { id: stepId })).rejects.toThrow(/CONFLICT: Step 0 can only be deleted or moved/);
    expect(await stepExists(stepId)).toBe(true);
  });

  it("refuses to move step 0 of a scheduled campaign to another order", async () => {
    const { stepId } = await seed("scheduled", []);
    await expect(callTool("campaigns_update_step", { id: stepId, order: 5 })).rejects.toThrow(/CONFLICT: Step 0 can only be deleted or moved/);
    expect((await prismadb.crm_campaign_steps.findUniqueOrThrow({ where: { id: stepId } })).order).toBe(0);
  });

  it("still edits step 0 of a scheduled campaign when the order stays", async () => {
    const { stepId } = await seed("scheduled", []);
    await callTool("campaigns_update_step", { id: stepId, subject: "New subject" });
    expect((await prismadb.crm_campaign_steps.findUniqueOrThrow({ where: { id: stepId } })).subject).toBe("New subject");
  });

  it("still deletes a follow-up step of a scheduled campaign", async () => {
    const { campaignId } = await seed("scheduled", []);
    const followUp = await prismadb.crm_campaign_steps.create({
      data: { campaign_id: campaignId, order: 1, template_id: templateId, subject: "Again", delay_days: 2 },
    });
    await callTool("campaigns_delete_step", { id: followUp.id });
    expect(await stepExists(followUp.id)).toBe(false);
  });

  it("still deletes and moves step 0 of a draft", async () => {
    const moved = await seed("draft", []);
    await callTool("campaigns_update_step", { id: moved.stepId, order: 5 });
    expect((await prismadb.crm_campaign_steps.findUniqueOrThrow({ where: { id: moved.stepId } })).order).toBe(5);
    const deleted = await seed("draft", []);
    await callTool("campaigns_delete_step", { id: deleted.stepId });
    expect(await stepExists(deleted.stepId)).toBe(false);
  });
});
