/**
 * Reports count only live records: a row with `deletedAt` set (and a target
 * that was soft-deleted from a list) is left out. DB-backed: CI runs it in the
 * integration job.
 *
 * Fixture: one user (role user) owns one live and one soft-deleted row of each
 * kind, all dated in 2002, so his scoped counts are exact. Admin checks use
 * labels only this fixture creates (account, campaign, template names).
 */
import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getReportScope } from "@/lib/authz/scopes/report-scope";
import { getCampaignROI, getTopTemplates, getTargetListGrowth } from "@/actions/reports/campaigns";
import { getActivitiesByType } from "@/actions/reports/activity";
import { getNewContacts, getContactsByAccount } from "@/actions/reports/leads";
import { getDashboardKPIs } from "@/actions/reports/dashboard";

const tag = randomUUID().slice(0, 8);
// No admin row: getReportScope needs only id + role, and an admin row would be
// picked up by findFirst({ role: "admin" }) in suites running in parallel.
const U = randomUUID();
const ACCOUNT = randomUUID();
// removed = deleted in the campaigns UI (status "deleted", deletedAt stays null)
const CAMPAIGN = { live: randomUUID(), deleted: randomUUID(), removed: randomUUID() };
const TEMPLATE = { live: randomUUID(), deleted: randomUUID(), removed: randomUUID() };
const TARGET = { live: randomUUID(), deleted: randomUUID() };
const LIST = { live: randomUUID(), deleted: randomUUID() };
const CONTACT = { live: randomUUID(), deleted: randomUUID() };
const ACTIVITY_TITLE = `sd-act-${tag}`;
const JUNE = new Date("2002-06-01");
const DELETED = new Date("2002-07-01");
const filters = { dateFrom: new Date("2002-01-01"), dateTo: new Date("2002-12-31") };

const user = () => getReportScope({ id: U, role: "user" });
const admin = () => getReportScope({ id: randomUUID(), role: "admin" });
const names = (rows: { name: string }[]) => rows.map((r) => r.name);

beforeAll(async () => {
  await prismadb.users.create({
    data: { id: U, email: `sd-${tag}@reports.test`, name: `sd-${tag}`, role: "user", userStatus: "ACTIVE" },
  });
  await prismadb.crm_Accounts.create({ data: { id: ACCOUNT, v: 0, name: `sd-acc-${tag}`, createdBy: U } });

  // Campaigns: one live, one soft-deleted, one deleted in the UI, each with its
  // own template and one send.
  await prismadb.crm_Targets.createMany({
    data: [
      { id: TARGET.live, last_name: `sd-${tag}` },
      { id: TARGET.deleted, last_name: `sd-${tag}`, deletedAt: DELETED },
    ],
  });
  for (const k of ["live", "deleted", "removed"] as const) {
    await prismadb.crm_campaign_templates.create({
      data: { id: TEMPLATE[k], name: `sd-tpl-${k}-${tag}`, content_html: "<p>x</p>", content_json: {} },
    });
    await prismadb.crm_campaigns.create({
      data: {
        id: CAMPAIGN[k], v: 0, name: `sd-${k}-${tag}`, status: k === "removed" ? "deleted" : "sent", created_by: U, template_id: TEMPLATE[k],
        created_on: JUNE, deletedAt: k === "deleted" ? DELETED : null,
      },
    });
    const step = await prismadb.crm_campaign_steps.create({
      data: { campaign_id: CAMPAIGN[k], order: 1, template_id: TEMPLATE[k], subject: "s" },
    });
    await prismadb.crm_campaign_sends.create({
      data: {
        campaign_id: CAMPAIGN[k], step_id: step.id, target_id: TARGET.live, email: `sd-${k}@reports.test`,
        status: "sent", sent_at: JUNE,
      },
    });
  }

  // Target lists: the live list holds a live and a soft-deleted target; the
  // soft-deleted list holds the live target.
  await prismadb.crm_TargetLists.create({
    data: {
      id: LIST.live, name: `sd-list-live-${tag}`, created_by: U, created_on: JUNE,
      targets: { create: [{ target_id: TARGET.live }, { target_id: TARGET.deleted }] },
    },
  });
  await prismadb.crm_TargetLists.create({
    data: {
      id: LIST.deleted, name: `sd-list-deleted-${tag}`, created_by: U, created_on: JUNE, deletedAt: DELETED,
      targets: { create: [{ target_id: TARGET.live }] },
    },
  });

  await prismadb.crm_Activities.createMany({
    data: [null, DELETED].map((deletedAt) => ({
      type: "call" as const, title: ACTIVITY_TITLE, date: JUNE, createdAt: JUNE, createdBy: U, deletedAt,
    })),
  });

  await prismadb.crm_Contacts.createMany({
    data: [
      { id: CONTACT.live, last_name: `sd-${tag}`, createdBy: U, accountsIDs: ACCOUNT, created_on: JUNE },
      { id: CONTACT.deleted, last_name: `sd-${tag}`, createdBy: U, accountsIDs: ACCOUNT, created_on: JUNE, deletedAt: DELETED },
    ],
  });
});

afterAll(async () => {
  const campaigns = Object.values(CAMPAIGN);
  await prismadb.crm_campaign_sends.deleteMany({ where: { campaign_id: { in: campaigns } } });
  await prismadb.crm_campaign_steps.deleteMany({ where: { campaign_id: { in: campaigns } } });
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: campaigns } } });
  await prismadb.crm_campaign_templates.deleteMany({ where: { id: { in: Object.values(TEMPLATE) } } });
  await prismadb.crm_TargetLists.deleteMany({ where: { id: { in: Object.values(LIST) } } });
  await prismadb.crm_Targets.deleteMany({ where: { id: { in: Object.values(TARGET) } } });
  await prismadb.crm_Activities.deleteMany({ where: { title: ACTIVITY_TITLE } });
  await prismadb.crm_Contacts.deleteMany({ where: { id: { in: Object.values(CONTACT) } } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: ACCOUNT } });
  await prismadb.users.deleteMany({ where: { id: U } });
  await prismadb.$disconnect();
});

describe("getActivitiesByType", () => {
  it("does not count a soft-deleted activity", async () => {
    expect(await getActivitiesByType(filters, user())).toEqual([{ name: "call", Number: 1 }]);
  });
});

describe("getTargetListGrowth", () => {
  it("counts neither a soft-deleted list nor a soft-deleted target on a live list", async () => {
    expect(await getTargetListGrowth(filters, user())).toEqual([{ name: "2002-06", Number: 1 }]);
  });
});

describe("getCampaignROI", () => {
  it("leaves out a soft-deleted campaign", async () => {
    expect(await getCampaignROI(filters, user())).toEqual([{ name: `sd-live-${tag}`, Number: 1 }]);
  });

  it("leaves it out for an admin too", async () => {
    const rows = names(await getCampaignROI(filters, admin()));
    expect(rows).toContain(`sd-live-${tag}`);
    expect(rows).not.toContain(`sd-deleted-${tag}`);
  });
});

describe("getTopTemplates", () => {
  it("does not count the template of a soft-deleted campaign or one deleted in the UI", async () => {
    expect(await getTopTemplates(filters, user())).toEqual([{ name: `sd-tpl-live-${tag}`, Number: 1 }]);
  });
});

describe("getNewContacts", () => {
  it("does not count a soft-deleted contact", async () => {
    expect(await getNewContacts(filters, user())).toEqual([{ name: "2002-06", Number: 1 }]);
  });
});

describe("getContactsByAccount", () => {
  it("does not count a soft-deleted contact", async () => {
    expect(await getContactsByAccount(filters, user())).toEqual([{ name: `sd-acc-${tag}`, Number: 1 }]);
  });

  it("does not count it for an admin either", async () => {
    const rows = await getContactsByAccount(filters, admin());
    expect(rows.find((r) => r.name === `sd-acc-${tag}`)?.Number).toBe(1);
  });
});

describe("getDashboardKPIs", () => {
  it("newContacts does not count a soft-deleted contact", async () => {
    const kpis = await getDashboardKPIs(filters, "EUR", user());
    expect(kpis.find((k) => k.label === "newContacts")?.value).toBe(1);
  });
});
