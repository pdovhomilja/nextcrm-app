// No DOM test environment in this repo: call the component directly with a minimal
// stand-in for useState and drive the Step 4 onSubmit prop (pattern from PluginSettingsForm.test.tsx).
const slots: unknown[] = [];
let slot = 0;
jest.mock("react", () => {
  const actual = jest.requireActual("react");
  return {
    ...actual,
    useState: (init: unknown) => {
      const i = slot++;
      if (!(i in slots)) slots[i] = typeof init === "function" ? (init as () => unknown)() : init;
      return [slots[i], (v: unknown) => { slots[i] = v; }];
    },
  };
});
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/actions/campaigns/create-campaign", () => ({ createCampaign: jest.fn() }));
jest.mock("@/actions/campaigns/send-campaign-now", () => ({ sendCampaignNow: jest.fn() }));
jest.mock("@/actions/campaigns/schedule-campaign", () => ({ scheduleCampaign: jest.fn() }));
jest.mock("@/app/[locale]/(routes)/campaigns/new/components/Step1Details", () => ({ Step1Details: () => null }));
jest.mock("@/app/[locale]/(routes)/campaigns/new/components/Step2Template", () => ({ Step2Template: () => null }));
jest.mock("@/app/[locale]/(routes)/campaigns/new/components/Step3Audience", () => ({ Step3Audience: () => null }));
jest.mock("@/app/[locale]/(routes)/campaigns/new/components/Step4Schedule", () => ({ Step4Schedule: () => null }));

import React, { type ReactElement } from "react";
import { toast } from "sonner";
import { createCampaign } from "@/actions/campaigns/create-campaign";
import { sendCampaignNow } from "@/actions/campaigns/send-campaign-now";
import { scheduleCampaign } from "@/actions/campaigns/schedule-campaign";
import { WizardShell } from "@/app/[locale]/(routes)/campaigns/new/components/WizardShell";

// Jest compiles JSX in classic mode, so the component file needs React in scope.
(global as unknown as { React: typeof React }).React = React;

type El = ReactElement<Record<string, unknown>>;
const find = (node: unknown, match: (p: Record<string, unknown>) => boolean): El | undefined => {
  if (Array.isArray(node)) { for (const n of node) { const f = find(n, match); if (f) return f; } return undefined; }
  if (!node || typeof node !== "object" || !("props" in node)) return undefined;
  const el = node as El;
  return match(el.props) ? el : find(el.props.children, match);
};

const submitStep4 = async (data: Record<string, unknown>) => {
  slots.length = 0;
  slots[0] = 4; // wizard is on step 4 (Schedule)
  slot = 0;
  const tree = WizardShell({ templates: [], targetLists: [] }) as El;
  const step4 = find(tree, (p) => typeof p.onSubmit === "function")!;
  await (step4.props.onSubmit as (d: unknown) => Promise<void>)({
    name: "Autumn promo", template_id: "t1", subject: "Hi", target_list_ids: ["l1"], ...data,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createCampaign).mockResolvedValue({ id: "camp-1" } as Awaited<ReturnType<typeof createCampaign>>);
});

type SendResult = Awaited<ReturnType<typeof sendCampaignNow>>;
type ScheduleResult = Awaited<ReturnType<typeof scheduleCampaign>>;

it("shows a refused send and opens the draft campaign", async () => {
  jest.mocked(sendCampaignNow).mockResolvedValue({ error: "Forbidden" } satisfies SendResult);

  await submitStep4({ send_now: true });

  expect(toast.error).toHaveBeenCalledWith("Forbidden");
  expect(push).toHaveBeenCalledWith("/campaigns/camp-1");
});

it("shows a refused schedule and opens the campaign", async () => {
  jest.mocked(scheduleCampaign).mockResolvedValue({ error: "Forbidden" } satisfies ScheduleResult);

  await submitStep4({ send_now: false, scheduled_at: new Date("2030-01-01T09:00:00Z") });

  expect(toast.error).toHaveBeenCalledWith("Forbidden");
  expect(push).toHaveBeenCalledWith("/campaigns/camp-1");
});

it("shows a thrown send failure and opens the campaign", async () => {
  jest.mocked(sendCampaignNow).mockRejectedValue(new Error("fetch failed"));

  await submitStep4({ send_now: true });

  expect(toast.error).toHaveBeenCalledWith("Campaign saved, but it could not be sent or scheduled");
  expect(push).toHaveBeenCalledWith("/campaigns/camp-1");
});

it("shows a thrown schedule failure and opens the campaign", async () => {
  jest.mocked(scheduleCampaign).mockRejectedValue(new Error("db down"));

  await submitStep4({ send_now: false, scheduled_at: new Date("2030-01-01T09:00:00Z") });

  expect(toast.error).toHaveBeenCalledWith("Campaign saved, but it could not be sent or scheduled");
  expect(push).toHaveBeenCalledWith("/campaigns/camp-1");
});

it("goes to the campaign list after an accepted send", async () => {
  jest.mocked(sendCampaignNow).mockResolvedValue(undefined satisfies SendResult);

  await submitStep4({ send_now: true });

  expect(toast.error).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith("/campaigns");
});

it("goes to the campaign list after an accepted schedule", async () => {
  jest.mocked(scheduleCampaign).mockResolvedValue({ id: "camp-1", status: "scheduled" } as ScheduleResult);

  await submitStep4({ send_now: false, scheduled_at: new Date("2030-01-01T09:00:00Z") });

  expect(toast.error).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith("/campaigns");
});

it("goes to the campaign list without sending when neither is chosen", async () => {
  await submitStep4({ send_now: false });

  expect(sendCampaignNow).not.toHaveBeenCalled();
  expect(scheduleCampaign).not.toHaveBeenCalled();
  expect(toast.error).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith("/campaigns");
});
