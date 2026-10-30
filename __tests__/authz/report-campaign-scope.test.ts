/**
 * Campaign performance (reports + /api/reports/export category "campaigns")
 * counts only the sends of campaigns the caller may see (Sentinel N3).
 * DB-backed: CI runs it in the integration job.
 *
 * Fixture: users A and B each own one campaign with sends dated in 2001, a
 * range no other fixture uses, so an admin's totals are exact.
 */
import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getReportScope } from "@/lib/authz/scopes/report-scope";
import { getCampaignPerformance } from "@/actions/reports/campaigns";

const tag = randomUUID().slice(0, 8);
const U = { A: randomUUID(), B: randomUUID(), admin: randomUUID() };
const CAMPAIGN = { A: randomUUID(), B: randomUUID() };
const TEMPLATE = randomUUID();
const TARGETS = [randomUUID(), randomUUID()]; // one send per (step, target)
const filters = { dateFrom: new Date("2001-01-01"), dateTo: new Date("2001-12-31") };

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [
      { id: U.A, email: `a-${tag}@n3.test`, name: `a-${tag}`, role: "user", userStatus: "ACTIVE" },
      { id: U.B, email: `b-${tag}@n3.test`, name: `b-${tag}`, role: "user", userStatus: "ACTIVE" },
      { id: U.admin, email: `admin-${tag}@n3.test`, name: `admin-${tag}`, role: "admin", userStatus: "ACTIVE" },
    ],
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
    for (const [i, s] of sends[k].entries()) {
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
});

afterAll(async () => {
  const ids = Object.values(CAMPAIGN);
  await prismadb.crm_campaign_sends.deleteMany({ where: { campaign_id: { in: ids } } });
  await prismadb.crm_campaign_steps.deleteMany({ where: { campaign_id: { in: ids } } });
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: ids } } });
  await prismadb.crm_Targets.deleteMany({ where: { id: { in: TARGETS } } });
  await prismadb.crm_campaign_templates.deleteMany({ where: { id: TEMPLATE } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

describe("getCampaignPerformance", () => {
  it("a user counts only the sends of his own campaigns, not another user's", async () => {
    const perf = await getCampaignPerformance(filters, getReportScope({ id: U.A, role: "user" }));
    expect(perf).toEqual({ sent: 1, opened: 1, clicked: 0, openRate: 100, clickRate: 0 });
  });

  it("an admin still counts every campaign's sends", async () => {
    const perf = await getCampaignPerformance(filters, getReportScope({ id: U.admin, role: "admin" }));
    expect(perf).toEqual({ sent: 3, opened: 2, clicked: 1, openRate: 67, clickRate: 33 });
  });
});
