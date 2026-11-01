/**
 * Campaign performance (reports + /api/reports/export category "campaigns")
 * counts only the sends of campaigns the caller may see (Sentinel N3); target
 * list growth and activities by type count only the caller's own lists and
 * activities. DB-backed: CI runs it in the integration job.
 *
 * Fixture: users A and B (role user) each own one campaign with sends, one
 * target list and activities, all dated in 2001.
 *
 * The dashboard's contractsExpiring KPI counts only the contracts the caller
 * may see: users A and B, partner P (on account PACC) and contracts ending at
 * one exact instant only this suite uses.
 */
import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getReportScope } from "@/lib/authz/scopes/report-scope";
import { getCampaignPerformance, getTargetListGrowth } from "@/actions/reports/campaigns";
import { getActivitiesByType } from "@/actions/reports/activity";
import { getDashboardKPIs } from "@/actions/reports/dashboard";

const tag = randomUUID().slice(0, 8);
// No admin row: getReportScope needs only id + role, and an admin row would be
// picked up by findFirst({ role: "admin" }) in suites running in parallel.
const U = { A: randomUUID(), B: randomUUID() };
const CAMPAIGN = { A: randomUUID(), B: randomUUID() };
const TEMPLATE = randomUUID();
const TARGETS = [randomUUID(), randomUUID()]; // one send per (step, target)
const LIST = { A: randomUUID(), B: randomUUID() }; // A: 1 target, B: 2 targets
const ACTIVITY_TITLE = `act-${tag}`; // A: 1 call, B: 2 notes
const filters = { dateFrom: new Date("2001-01-01"), dateTo: new Date("2001-12-31") };
const P = randomUUID(); // partner of account PACC
const ACC = { P: randomUUID(), other: randomUUID() };
const CONTRACT_TITLE = `contract-${tag}`;
// Random millisecond in 2001: no other suite's contract ends at this instant.
const END = new Date(Date.UTC(2001, 7, 1) + Math.floor(Math.random() * 86_400_000));

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [
      { id: U.A, email: `a-${tag}@n3.test`, name: `a-${tag}`, role: "user", userStatus: "ACTIVE" },
      { id: U.B, email: `b-${tag}@n3.test`, name: `b-${tag}`, role: "user", userStatus: "ACTIVE" },
    ],
  });
  await prismadb.users.create({
    data: { id: P, email: `p-${tag}@n3.test`, name: `p-${tag}`, role: "partner", userStatus: "ACTIVE" },
  });
  await prismadb.crm_Accounts.createMany({
    data: [
      { id: ACC.P, v: 0, name: `pacc-${tag}`, partnerUserId: P },
      { id: ACC.other, v: 0, name: `oacc-${tag}` },
    ],
  });
  // A sees 2 (assigned, created), B sees 2 (created, assigned), P sees 1 (on
  // PACC), an admin sees 4. The soft-deleted one counts for nobody.
  await prismadb.crm_Contracts.createMany({
    data: [
      { assigned_to: U.A, createdBy: U.B },
      { createdBy: U.A },
      { assigned_to: U.B, account: ACC.P },
      { account: ACC.other },
      { assigned_to: U.A, createdBy: U.A, account: ACC.P, deletedAt: new Date() },
    ].map((c) => ({ ...c, v: 0, title: CONTRACT_TITLE, value: 1, endDate: END })),
  });
  await prismadb.crm_campaign_templates.create({
    data: { id: TEMPLATE, name: `t-${tag}`, content_html: "<p>x</p>", content_json: {} },
  });
  await prismadb.crm_Targets.createMany({ data: TARGETS.map((id) => ({ id, last_name: `target-${tag}` })) });
  // A: 1 send, opened. B: 2 sends, one opened and clicked.
  const sends = { A: [{ opened: true, clicked: false }], B: [{ opened: true, clicked: true }, { opened: false, clicked: false }] };
  for (const k of ["A", "B"] as const) {
    await prismadb.crm_campaigns.create({
      data: { id: CAMPAIGN[k], v: 0, name: `${k}-${tag}`, status: "sent", created_by: U[k] },
    });
    const step = await prismadb.crm_campaign_steps.create({
      data: { campaign_id: CAMPAIGN[k], order: 1, template_id: TEMPLATE, subject: "s" },
    });
    for (const [i, s] of Array.from(sends[k].entries())) {
      await prismadb.crm_campaign_sends.create({
        data: {
          campaign_id: CAMPAIGN[k], step_id: step.id, target_id: TARGETS[i], email: `${k}@n3.test`, status: "sent",
          sent_at: new Date("2001-06-01"),
          opened_at: s.opened ? new Date("2001-06-02") : null,
          clicked_at: s.clicked ? new Date("2001-06-02") : null,
        },
      });
    }
  }
  for (const k of ["A", "B"] as const) {
    await prismadb.crm_TargetLists.create({
      data: {
        id: LIST[k], name: `list-${k}-${tag}`, created_by: U[k], created_on: new Date("2001-06-01"),
        targets: { create: (k === "A" ? TARGETS.slice(0, 1) : TARGETS).map((target_id) => ({ target_id })) },
      },
    });
  }
  await prismadb.crm_Activities.createMany({
    data: [
      { type: "call" as const, createdBy: U.A },
      { type: "note" as const, createdBy: U.B },
      { type: "note" as const, createdBy: U.B },
    ].map((a) => ({ ...a, title: ACTIVITY_TITLE, date: new Date("2001-06-01"), createdAt: new Date("2001-06-01") })),
  });
});

afterAll(async () => {
  const ids = Object.values(CAMPAIGN);
  await prismadb.crm_campaign_sends.deleteMany({ where: { campaign_id: { in: ids } } });
  await prismadb.crm_campaign_steps.deleteMany({ where: { campaign_id: { in: ids } } });
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: ids } } });
  await prismadb.crm_Activities.deleteMany({ where: { title: ACTIVITY_TITLE } });
  await prismadb.crm_TargetLists.deleteMany({ where: { id: { in: Object.values(LIST) } } });
  await prismadb.crm_Targets.deleteMany({ where: { id: { in: TARGETS } } });
  await prismadb.crm_campaign_templates.deleteMany({ where: { id: TEMPLATE } });
  await prismadb.crm_Contracts.deleteMany({ where: { title: CONTRACT_TITLE } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: Object.values(ACC) } } });
  await prismadb.users.deleteMany({ where: { id: { in: [...Object.values(U), P] } } });
  await prismadb.$disconnect();
});

describe("getCampaignPerformance", () => {
  it("a user counts only the sends of his own campaigns, not another user's", async () => {
    const perf = await getCampaignPerformance(filters, getReportScope({ id: U.A, role: "user" }));
    expect(perf).toEqual({ sent: 1, opened: 1, clicked: 0, openRate: 100, clickRate: 0 });
  });

  it("an admin still counts every campaign's sends", async () => {
    // At least both users' sends: suites running in parallel on the CI
    // database may add their own in the same range.
    const perf = await getCampaignPerformance(filters, getReportScope({ id: randomUUID(), role: "admin" }));
    expect(perf.sent).toBeGreaterThanOrEqual(3);
    expect(perf.opened).toBeGreaterThanOrEqual(2);
    expect(perf.clicked).toBeGreaterThanOrEqual(1);
  });
});

const partner = () => getReportScope({ id: randomUUID(), role: "partner" });
const admin = () => getReportScope({ id: randomUUID(), role: "admin" });
const countOf = (rows: { name: string; Number: number }[], name: string) =>
  rows.find((r) => r.name === name)?.Number ?? 0;

describe("getTargetListGrowth", () => {
  it("a user counts only the targets on his own lists", async () => {
    expect(await getTargetListGrowth(filters, getReportScope({ id: U.A, role: "user" })))
      .toEqual([{ name: "2001-06", Number: 1 }]);
  });

  it("a partner counts no lists", async () => {
    expect(await getTargetListGrowth(filters, partner())).toEqual([]);
  });

  it("an admin counts every list", async () => {
    expect(countOf(await getTargetListGrowth(filters, admin()), "2001-06")).toBeGreaterThanOrEqual(3);
  });
});

describe("getActivitiesByType", () => {
  it("a user counts only the activities he created", async () => {
    expect(await getActivitiesByType(filters, getReportScope({ id: U.B, role: "user" })))
      .toEqual([{ name: "note", Number: 2 }]);
  });

  it("a partner counts no activities", async () => {
    expect(await getActivitiesByType(filters, partner())).toEqual([]);
  });

  it("an admin counts every activity", async () => {
    const rows = await getActivitiesByType(filters, admin());
    expect(countOf(rows, "call")).toBeGreaterThanOrEqual(1);
    expect(countOf(rows, "note")).toBeGreaterThanOrEqual(2);
  });
});

describe("getDashboardKPIs contractsExpiring", () => {
  // dateFrom = dateTo = END, so the previous period ends at END too and both
  // counts cover the fixture.
  const expiring = async (scope: ReturnType<typeof admin>) => {
    const kpi = (await getDashboardKPIs({ dateFrom: END, dateTo: END }, "EUR", scope))
      .find((k) => k.label === "contractsExpiring");
    return [kpi?.value, kpi?.previousValue];
  };

  it("a user counts only contracts assigned to or created by him", async () => {
    expect(await expiring(getReportScope({ id: U.A, role: "user" }))).toEqual([2, 2]);
    expect(await expiring(getReportScope({ id: U.B, role: "user" }))).toEqual([2, 2]);
  });

  it("a partner counts only contracts on his accounts", async () => {
    expect(await expiring(getReportScope({ id: P, role: "partner" }))).toEqual([1, 1]);
  });

  it("a manager and an admin count every live contract", async () => {
    expect(await expiring(getReportScope({ id: randomUUID(), role: "manager" }))).toEqual([4, 4]);
    expect(await expiring(admin())).toEqual([4, 4]);
  });
});
