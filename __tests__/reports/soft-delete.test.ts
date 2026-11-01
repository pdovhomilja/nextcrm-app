/**
 * Reports count only live records: a row with `deletedAt` set (and a target
 * that was soft-deleted from a list) is left out. DB-backed: CI runs it in the
 * integration job.
 *
 * Fixture: one user (role user) owns one live and one soft-deleted row of each
 * kind, all dated in 2002, so his scoped counts are exact. Admin checks use
 * labels only this fixture creates (account, campaign, template names), and
 * the unscoped campaignsSent KPI is read over this fixture's exact send time.
 */
import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getReportScope } from "@/lib/authz/scopes/report-scope";
import { getCampaignPerformance, getCampaignROI, getTopTemplates, getTargetListGrowth } from "@/actions/reports/campaigns";
import {
  getActivitiesByType, getTasksCreatedCompleted, getOverdueTasks, getTasksByAssignee,
} from "@/actions/reports/activity";
import { getNewContacts, getContactsByAccount } from "@/actions/reports/leads";
import { getDashboardKPIs } from "@/actions/reports/dashboard";

const tag = randomUUID().slice(0, 8);
// No admin row: getReportScope needs only id + role, and an admin row would be
// picked up by findFirst({ role: "admin" }) in suites running in parallel.
const U = randomUUID();
const ACCOUNT = randomUUID();
// removed = deleted in the campaigns UI (status "deleted", deletedAt stays null);
// nostatus = live campaign whose status is NULL (the column has no default).
const CAMPAIGN = { live: randomUUID(), deleted: randomUUID(), removed: randomUUID(), nostatus: randomUUID() };
const TEMPLATE = { live: randomUUID(), deleted: randomUUID(), removed: randomUUID(), nostatus: randomUUID() };
const STATUS = { live: "sent", deleted: "sent", removed: "deleted", nostatus: null };
// Tasks: one without a section, one on a live board, one on a soft-deleted board.
const BOARD = { live: randomUUID(), deleted: randomUUID() };
const TASK = { nosection: randomUUID(), live: randomUUID(), deleted: randomUUID() };
const TARGET = { live: randomUUID(), deleted: randomUUID() };
const LIST = { live: randomUUID(), deleted: randomUUID() };
const CONTACT = { live: randomUUID(), deleted: randomUUID() };
const ACTIVITY_TITLE = `sd-act-${tag}`;
const JUNE = new Date("2002-06-01");
const DELETED = new Date("2002-07-01");
const SENT_AT = new Date("2002-06-15T03:21:07.123Z");
const filters = { dateFrom: new Date("2002-01-01"), dateTo: new Date("2002-12-31") };

const user = () => getReportScope({ id: U, role: "user" });
const admin = () => getReportScope({ id: randomUUID(), role: "admin" });
const names = (rows: { name: string }[]) => rows.map((r) => r.name);

beforeAll(async () => {
  await prismadb.users.create({
    data: { id: U, email: `sd-${tag}@reports.test`, name: `sd-${tag}`, role: "user", userStatus: "ACTIVE" },
  });
  await prismadb.crm_Accounts.create({ data: { id: ACCOUNT, v: 0, name: `sd-acc-${tag}`, createdBy: U } });

  // Campaigns: live, soft-deleted, deleted in the UI and live with NULL status,
  // each with its own template and one send.
  await prismadb.crm_Targets.createMany({
    data: [
      { id: TARGET.live, last_name: `sd-${tag}` },
      { id: TARGET.deleted, last_name: `sd-${tag}`, deletedAt: DELETED },
    ],
  });
  for (const k of ["live", "deleted", "removed", "nostatus"] as const) {
    await prismadb.crm_campaign_templates.create({
      data: { id: TEMPLATE[k], name: `sd-tpl-${k}-${tag}`, content_html: "<p>x</p>", content_json: {} },
    });
    await prismadb.crm_campaigns.create({
      data: {
        id: CAMPAIGN[k], v: 0, name: `sd-${k}-${tag}`, status: STATUS[k], created_by: U, template_id: TEMPLATE[k],
        created_on: JUNE, deletedAt: k === "deleted" ? DELETED : null,
      },
    });
    const step = await prismadb.crm_campaign_steps.create({
      data: { campaign_id: CAMPAIGN[k], order: 1, template_id: TEMPLATE[k], subject: "s" },
    });
    await prismadb.crm_campaign_sends.create({
      data: {
        campaign_id: CAMPAIGN[k], step_id: step.id, target_id: TARGET.live, email: `sd-${k}@reports.test`,
        status: "sent", sent_at: SENT_AT,
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

  for (const k of ["live", "deleted"] as const) {
    await prismadb.boards.create({
      data: { id: BOARD[k], v: 0, title: `sd-${k}-${tag}`, description: "x", user: U, deletedAt: k === "deleted" ? DELETED : null },
    });
    const section = await prismadb.sections.create({ data: { v: 0, board: BOARD[k], title: `sd-${k}-${tag}` } });
    await prismadb.tasks.create({
      data: {
        id: TASK[k], v: 0, position: 0, priority: "low", title: `sd-${k}-${tag}`, user: U, section: section.id,
        taskStatus: "ACTIVE", createdAt: JUNE, dueDateAt: JUNE,
      },
    });
  }
  await prismadb.tasks.create({
    data: {
      id: TASK.nosection, v: 0, position: 0, priority: "low", title: `sd-nosection-${tag}`, user: U,
      taskStatus: "ACTIVE", createdAt: JUNE, dueDateAt: JUNE,
    },
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
  await prismadb.tasks.deleteMany({ where: { id: { in: Object.values(TASK) } } });
  await prismadb.sections.deleteMany({ where: { board: { in: Object.values(BOARD) } } });
  await prismadb.boards.deleteMany({ where: { id: { in: Object.values(BOARD) } } });
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
    const rows = names(await getTopTemplates(filters, user()));
    expect(rows).not.toContain(`sd-tpl-deleted-${tag}`);
    expect(rows).not.toContain(`sd-tpl-removed-${tag}`);
  });

  it("still counts a live campaign whose status is NULL", async () => {
    expect((await getTopTemplates(filters, user())).sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { name: `sd-tpl-live-${tag}`, Number: 1 },
      { name: `sd-tpl-nostatus-${tag}`, Number: 1 },
    ]);
  });
});

describe("getCampaignPerformance", () => {
  it("does not count the sends of a soft-deleted campaign or one deleted in the UI", async () => {
    expect((await getCampaignPerformance(filters, user())).sent).toBe(2); // live + nostatus
  });

  it("a partner still counts no sends", async () => {
    expect((await getCampaignPerformance(filters, getReportScope({ id: randomUUID(), role: "partner" }))).sent).toBe(0);
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

describe("task reports", () => {
  it("getTasksCreatedCompleted skips tasks on a soft-deleted board, keeps tasks without a section", async () => {
    expect(await getTasksCreatedCompleted(filters, user())).toEqual([{ name: "2002-06", created: 2, completed: 0 }]);
  });

  it("getOverdueTasks skips tasks on a soft-deleted board", async () => {
    expect(await getOverdueTasks(filters, user())).toBe(2);
  });

  it("getTasksByAssignee skips tasks on a soft-deleted board", async () => {
    expect(await getTasksByAssignee(filters, user())).toEqual([{ name: `sd-${tag}`, Number: 2 }]);
  });

  it("a partner still counts no tasks", async () => {
    expect(await getOverdueTasks(filters, getReportScope({ id: randomUUID(), role: "partner" }))).toBe(0);
  });
});

describe("getDashboardKPIs", () => {
  it("openTasks skips tasks on a soft-deleted board", async () => {
    const kpis = await getDashboardKPIs(filters, "EUR", user());
    expect(kpis.find((k) => k.label === "openTasks")?.value).toBe(2);
  });

  it("campaignsSent does not count the sends of a deleted campaign", async () => {
    const kpis = await getDashboardKPIs({ dateFrom: SENT_AT, dateTo: SENT_AT }, "EUR", admin());
    expect(kpis.find((k) => k.label === "campaignsSent")?.value).toBe(2); // live + nostatus
  });

  it("newContacts does not count a soft-deleted contact", async () => {
    const kpis = await getDashboardKPIs(filters, "EUR", user());
    expect(kpis.find((k) => k.label === "newContacts")?.value).toBe(1);
  });
});
