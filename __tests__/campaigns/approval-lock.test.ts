/**
 * Scheduling and sending a campaign needs a manager or admin, so scheduling is
 * the approval step. Once a campaign is scheduled or sending, only a manager or
 * admin may change what it sends: the campaign, its steps, the templates it
 * uses and the target lists it sends to (membership and campaign links). Draft
 * campaigns stay editable by their owner. Every entry point (UI actions and MCP
 * tools) is called for real against Postgres. DB-backed: CI runs it in the
 * integration job.
 *
 * Fixture: user `rep` owns two campaigns, `lock` (scheduled) and `draft`, each
 * with its own template (used by the campaign's steps), target list and steps.
 * `boss` is a manager.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import type { AuthzUser } from "@/lib/authz";
import { updateCampaign } from "@/actions/campaigns/update-campaign";
import { updateTemplate } from "@/actions/campaigns/templates/update-template";
import { addTargetsToList } from "@/actions/crm/target-lists/add-targets-to-list";
import { removeTargetFromList } from "@/actions/crm/target-lists/remove-target-from-list";
import { campaignTools } from "@/lib/mcp/tools/campaigns";
import { crmTargetListTools as targetListTools } from "@/lib/mcp/tools/crm-target-lists";
import { runMcpToolCall } from "@/lib/mcp/run-tool";
import { CAMPAIGN_LOCKED_MESSAGE } from "@/lib/campaigns/approval-lock";

type Side = "lock" | "draft";
type Who = "rep" | "boss";
const SIDES: Side[] = ["lock", "draft"];
const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), boss: randomUUID() };
const ROLE = { rep: "user", boss: "manager" } as const;
const per = () => ({ lock: randomUUID(), draft: randomUUID() });
const C = per(), TPL = per(), LIST = per(), LIST_X = randomUUID(), STEP = per(), STEP_DEL = per();
const T = { rmUi: randomUUID(), rmMcp: randomUUID(), addUi: randomUUID(), addMcp: randomUUID() };
let n = 0;
const next = () => `${tag}-${++n}`;

const ui = (who: Who) => (getSession as jest.Mock).mockResolvedValue({ user: { id: U[who] } });
const mcp = async (tools: unknown[], name: string, args: unknown, who: Who) => {
  const tool = (tools as { name: string; handler: (...a: unknown[]) => unknown }[]).find((t) => t.name === name)!;
  const user: AuthzUser = { id: U[who], role: ROLE[who] };
  const res = await runMcpToolCall(async () => user as never, (u) => tool.handler(args, u.id, u) as never);
  return { refused: !!res.isError, text: res.content[0].text };
};
const uiRefused = (r: unknown) => ({ refused: !!(r && typeof r === "object" && "error" in r), text: JSON.stringify(r) });

beforeAll(async () => {
  await prismadb.users.createMany({
    data: (["rep", "boss"] as const).map((k) => ({
      id: U[k], email: `${k}-${tag}@approval-lock.test`, name: `${k}-${tag}`, role: ROLE[k], userStatus: "ACTIVE",
    })),
  });
  await prismadb.crm_Targets.createMany({
    data: Object.values(T).map((id) => ({ id, last_name: `t-${tag}`, email: `${id}@approval-lock.test`, created_by: U.rep })),
  });
  await prismadb.crm_TargetLists.create({ data: { id: LIST_X, name: `list-x-${tag}`, created_by: U.rep } });
  for (const s of SIDES) {
    await prismadb.crm_campaign_templates.create({
      data: { id: TPL[s], name: `tpl-${tag}`, content_html: "<p>x</p>", content_json: {}, created_by: U.rep },
    });
    await prismadb.crm_campaigns.create({
      data: { id: C[s], v: 0, name: `c-${tag}`, status: s === "lock" ? "scheduled" : "draft", created_by: U.rep },
    });
    await prismadb.crm_campaign_steps.createMany({
      data: [
        { id: STEP[s], campaign_id: C[s], order: 0, template_id: TPL[s], subject: "s0" },
        { id: STEP_DEL[s], campaign_id: C[s], order: 1, template_id: TPL[s], subject: "s1" },
      ],
    });
    await prismadb.crm_TargetLists.create({ data: { id: LIST[s], name: `list-${tag}`, created_by: U.rep } });
    await prismadb.campaignToTargetLists.create({ data: { campaign_id: C[s], target_list_id: LIST[s] } });
    await prismadb.targetsToTargetLists.createMany({
      data: [T.rmUi, T.rmMcp].map((target_id) => ({ target_id, target_list_id: LIST[s] })),
    });
  }
});

afterAll(async () => {
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: Object.values(C) } } });
  await prismadb.crm_campaign_templates.deleteMany({ where: { id: { in: Object.values(TPL) } } });
  await prismadb.crm_TargetLists.deleteMany({ where: { id: { in: [...Object.values(LIST), LIST_X] } } });
  await prismadb.crm_Targets.deleteMany({ where: { id: { in: Object.values(T) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

// Everything the campaign on one side would send.
async function snapshot(s: Side) {
  const [campaign, template, steps, members, links] = await Promise.all([
    prismadb.crm_campaigns.findUnique({ where: { id: C[s] }, select: { name: true, template_id: true, status: true } }),
    prismadb.crm_campaign_templates.findUnique({ where: { id: TPL[s] }, select: { name: true } }),
    prismadb.crm_campaign_steps.findMany({ where: { campaign_id: C[s] }, select: { id: true, subject: true, order: true }, orderBy: { id: "asc" } }),
    prismadb.targetsToTargetLists.findMany({ where: { target_list_id: LIST[s] }, select: { target_id: true }, orderBy: { target_id: "asc" } }),
    prismadb.campaignToTargetLists.findMany({ where: { campaign_id: C[s] }, select: { target_list_id: true }, orderBy: { target_list_id: "asc" } }),
  ]);
  return JSON.stringify({ campaign, template, steps, members, links });
}

type Run = (who: Who, s: Side) => Promise<{ refused: boolean; text: string }>;
const ENTRIES: [string, Run][] = [
  ["updateCampaign", async (who, s) => { ui(who); return uiRefused(await updateCampaign(C[s], { name: `c-${next()}` })); }],
  ["updateTemplate", async (who, s) => { ui(who); return uiRefused(await updateTemplate(TPL[s], { name: `tpl-${next()}` })); }],
  ["addTargetsToList", async (who, s) => { ui(who); return uiRefused(await addTargetsToList(LIST[s], [T.addUi])); }],
  ["removeTargetFromList", async (who, s) => { ui(who); return uiRefused(await removeTargetFromList(LIST[s], T.rmUi)); }],
  ["MCP campaigns_update", (who, s) => mcp(campaignTools, "campaigns_update", { id: C[s], name: `c-${next()}` }, who)],
  ["MCP campaigns_update_template", (who, s) => mcp(campaignTools, "campaigns_update_template", { id: TPL[s], name: `tpl-${next()}` }, who)],
  ["MCP campaigns_create_step", (who, s) => mcp(campaignTools, "campaigns_create_step", { campaign_id: C[s], order: 2 + n++, template_id: TPL[s], subject: "new", delay_days: 1, send_to: "all" }, who)],
  ["MCP campaigns_update_step", (who, s) => mcp(campaignTools, "campaigns_update_step", { id: STEP[s], subject: `s-${next()}` }, who)],
  ["MCP campaigns_delete_step", (who, s) => mcp(campaignTools, "campaigns_delete_step", { id: STEP_DEL[s] }, who)],
  ["MCP crm_add_to_target_list", (who, s) => mcp(targetListTools, "crm_add_to_target_list", { target_list_id: LIST[s], target_ids: [T.addMcp] }, who)],
  ["MCP crm_remove_from_target_list", (who, s) => mcp(targetListTools, "crm_remove_from_target_list", { target_list_id: LIST[s], target_ids: [T.rmMcp] }, who)],
  ["MCP campaigns_assign_target_list", (who, s) => mcp(campaignTools, "campaigns_assign_target_list", { campaign_id: C[s], target_list_id: LIST_X }, who)],
  ["MCP campaigns_remove_target_list", (who, s) => mcp(campaignTools, "campaigns_remove_target_list", { campaign_id: C[s], target_list_id: LIST[s] }, who)],
];

describe.each(ENTRIES)("%s", (_name, run) => {
  it("refuses a plain user on a scheduled campaign and changes nothing", async () => {
    const before = await snapshot("lock");
    const r = await run("rep", "lock");
    expect(r.refused).toBe(true);
    expect(r.text).toContain(CAMPAIGN_LOCKED_MESSAGE);
    expect(await snapshot("lock")).toBe(before);
  });

  it("lets a manager change a scheduled campaign", async () => {
    const before = await snapshot("lock");
    const r = await run("boss", "lock");
    expect(r).toMatchObject({ refused: false });
    expect(await snapshot("lock")).not.toBe(before);
  });

  it("lets the owner change a draft campaign", async () => {
    const before = await snapshot("draft");
    const r = await run("rep", "draft");
    expect(r).toMatchObject({ refused: false });
    expect(await snapshot("draft")).not.toBe(before);
  });
});

describe("which statuses lock", () => {
  afterAll(() => prismadb.crm_campaigns.update({ where: { id: C.draft }, data: { status: "draft" } }));

  it.each([
    ["sending", true],
    ["paused", false],
    ["sent", false],
  ])("%s: locked = %s", async (status, locked) => {
    await prismadb.crm_campaigns.update({ where: { id: C.draft }, data: { status } });
    ui("rep");
    const r = uiRefused(await updateCampaign(C.draft, { name: `c-${next()}` }));
    expect(r.refused).toBe(locked);
  });
});
