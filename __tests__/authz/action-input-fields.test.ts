/**
 * Create/update server actions write only their declared fields: a server
 * action takes whatever the client posts, so the TypeScript parameter type
 * must hold at runtime. Fields the server sets (owner, version, timestamps)
 * always win over the input. DB-backed: CI runs it in the integration job.
 *
 * Fixture: two plain users (`rep`, `other`) and a manager (`boss`), each user
 * with an account and a contact on it. Each action is called as `rep`.
 * Refused input returns an error and changes nothing; the payloads the UI
 * forms send keep working.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/sendmail", () => jest.fn(async () => undefined));
jest.mock("@/app/[locale]/(routes)/campaigns/new/components/WizardShell", () => ({ WizardShell: () => null }));
jest.mock("@/lib/crm/calendar/outbound-emit", () => ({ emitCalendarOutbound: jest.fn(async () => undefined) }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createTemplate } from "@/actions/campaigns/templates/create-template";
import { createTarget } from "@/actions/crm/targets/create-target";
import { updateTarget } from "@/actions/crm/targets/update-target";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { createContact } from "@/actions/crm/contacts/create-contact";
import { updateContact } from "@/actions/crm/contacts/update-contact";
import { createCampaign } from "@/actions/campaigns/create-campaign";
import { updateActivity } from "@/actions/crm/activities/update-activity";
import NewCampaignPage from "@/app/[locale]/(routes)/campaigns/new/page";
import { createSchedule, updateSchedule } from "@/actions/reports/schedule";

const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), other: randomUUID(), boss: randomUUID(), partner: randomUUID(), gone: randomUUID() };
const ACC = { rep: randomUUID(), other: randomUUID() };
const CONTACT = { rep: randomUUID(), other: randomUUID() };
const TARGET = randomUUID();
const CAMP_OTHER = randomUUID();
const TPL_REP = randomUUID();
const INDUSTRY = randomUUID();

const as = (who: keyof typeof U) => (getSession as jest.Mock).mockResolvedValue({ user: { id: U[who] } });

beforeAll(async () => {
  await prismadb.users.createMany({
    data: (["rep", "other", "boss", "partner", "gone"] as const).map((k) => ({
      id: U[k], email: `${k}-${tag}@input-fields.test`, name: `${k}-${tag}`,
      role: k === "boss" ? "manager" : k === "partner" ? "partner" : "user",
      userStatus: k === "gone" ? "INACTIVE" : "ACTIVE",
    })),
  });
  await prismadb.crm_Industry_Type.create({ data: { id: INDUSTRY, name: `industry-${tag}` } });
  for (const k of ["rep", "other"] as const) {
    await prismadb.crm_Accounts.create({
      data: { id: ACC[k], v: 0, name: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
    await prismadb.crm_Contacts.create({
      data: { id: CONTACT[k], v: 0, last_name: `${k}-${tag}`, accountsIDs: ACC[k], assigned_to: U[k], createdBy: U[k] },
    });
  }
  await prismadb.crm_campaign_templates.create({
    data: { id: TPL_REP, name: `tpl-${tag}`, content_html: "<p>x</p>", content_json: {}, created_by: U.rep },
  });
  await prismadb.crm_campaigns.create({
    data: { id: CAMP_OTHER, v: 0, name: `other-${tag}`, status: "draft", created_by: U.other },
  });
  await prismadb.crm_Targets.create({
    data: { id: TARGET, last_name: `target-${tag}`, created_by: U.rep },
  });
});

afterAll(async () => {
  const activities = await prismadb.crm_Activities.findMany({ where: { title: { contains: tag } }, select: { id: true } });
  await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: { in: activities.map((a) => a.id) } } });
  await prismadb.crm_Activities.deleteMany({ where: { id: { in: activities.map((a) => a.id) } } });
  await prismadb.crm_Contacts.deleteMany({ where: { last_name: { contains: tag } } });
  await prismadb.crm_Accounts.deleteMany({ where: { name: { contains: tag } } });
  await prismadb.crm_Industry_Type.deleteMany({ where: { id: INDUSTRY } });
  await prismadb.crm_Targets.deleteMany({ where: { last_name: { contains: tag } } });
  const campaigns = await prismadb.crm_campaigns.findMany({ where: { name: { contains: tag } }, select: { id: true } });
  await prismadb.crm_campaign_steps.deleteMany({ where: { campaign_id: { in: campaigns.map((c) => c.id) } } });
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: campaigns.map((c) => c.id) } } });
  await prismadb.crm_campaign_templates.deleteMany({ where: { name: { contains: tag } } });
  await prismadb.crm_Report_Config.deleteMany({ where: { name: { contains: tag } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

// Cast: these payloads are exactly what the parameter types forbid.
const loose = (o: unknown) => o as never;

describe("createTemplate fields", () => {
  const editorFields = (name: string) => ({
    name,
    description: "d",
    subject_default: "s",
    content_html: "<p>Hi</p>",
    content_json: { type: "doc", content: [] },
  });
  const count = (name: string) => prismadb.crm_campaign_templates.count({ where: { name } });

  it.each<[string, (name: string) => unknown]>([
    ["created_by", (name) => ({ ...editorFields(name), created_by: U.other })],
    ["deletedAt", (name) => ({ ...editorFields(name), deletedAt: new Date("2026-01-01") })],
    ["relation write on campaigns", (name) => ({ ...editorFields(name), campaigns: { connect: [{ id: CAMP_OTHER }] } })],
    ["empty name", () => ({ ...editorFields(""), name: "" })],
    ["data that is not an object", () => null],
  ])("refuses %s and creates nothing", async (label, payload) => {
    as("rep");
    const name = `tpl-${tag}-${label}`;
    expect(await createTemplate(loose(payload(name)))).toEqual({ error: "Invalid input" });
    expect(await count(name)).toBe(0);
    expect(await prismadb.crm_campaigns.findUnique({ where: { id: CAMP_OTHER } })).toMatchObject({ template_id: null });
  });

  it("creates a template from the editor fields, owned by the caller", async () => {
    as("rep");
    const name = `tpl-${tag}-ok`;
    await createTemplate(editorFields(name));
    expect(await prismadb.crm_campaign_templates.findFirst({ where: { name } })).toMatchObject({
      ...editorFields(name),
      created_by: U.rep,
    });
  });
});

// What NewTargetForm and UpdateTargetForm send.
const targetFormFields = (last_name: string) => ({
  first_name: "f", last_name, email: "t@example.com", mobile_phone: "1", office_phone: "2",
  company: "c", company_website: "https://c.example", personal_website: "https://p.example", position: "p",
  social_x: "x", social_linkedin: "l", social_instagram: "i", social_facebook: "fb",
  personal_email: "pe@example.com", company_email: "ce@example.com", company_phone: "3",
  city: "ci", country: "co", industry: "in", employees: "10", description: "de", status: true,
});

describe("createTarget fields", () => {
  const count = (last_name: string) => prismadb.crm_Targets.count({ where: { last_name } });

  it.each<[string, (n: string) => unknown]>([
    ["created_by", (n) => ({ ...targetFormFields(n), created_by: U.other })],
    ["deletedAt", (n) => ({ ...targetFormFields(n), deletedAt: new Date("2026-01-01") })],
    ["converted_account_id", (n) => ({ ...targetFormFields(n), converted_account_id: ACC.other })],
    ["relation write on target lists", (n) => ({ ...targetFormFields(n), target_lists: { create: [] } })],
  ])("refuses %s and creates nothing", async (label, payload) => {
    as("rep");
    const n = `target-${tag}-${label}`;
    expect(await createTarget(loose(payload(n)))).toEqual({ error: "Invalid input" });
    expect(await count(n)).toBe(0);
  });

  it("creates a target from every field the form sends, owned by the caller", async () => {
    as("rep");
    const n = `target-${tag}-ok`;
    await createTarget(targetFormFields(n));
    expect(await prismadb.crm_Targets.findFirst({ where: { last_name: n } })).toMatchObject({
      ...targetFormFields(n),
      created_by: U.rep,
    });
  });
});

describe("updateTarget fields", () => {
  const row = () => prismadb.crm_Targets.findUnique({ where: { id: TARGET } });

  beforeEach(async () => {
    await prismadb.crm_Targets.update({
      where: { id: TARGET },
      data: { created_by: U.rep, updatedBy: null, deletedAt: null, converted_account_id: null },
    });
  });

  it.each<[string, () => unknown]>([
    ["updatedBy", () => ({ updatedBy: U.other })],
    ["created_by", () => ({ created_by: U.other })],
    ["deletedAt", () => ({ deletedAt: new Date("2026-01-01") })],
    ["converted_account_id", () => ({ converted_account_id: ACC.other })],
    ["an allowed field next to a refused one", () => ({ first_name: `x-${tag}`, created_by: U.other })],
  ])("refuses %s and changes nothing", async (_label, payload) => {
    as("rep");
    const before = await row();
    expect(await updateTarget(loose({ id: TARGET, ...(payload() as object) }))).toEqual({ error: "Invalid input" });
    expect(await row()).toEqual(before);
  });

  it("saves every field the form sends and records the caller", async () => {
    as("rep");
    const fields = targetFormFields(`target-${tag}`);
    await updateTarget({ id: TARGET, ...fields });
    expect(await row()).toMatchObject({ ...fields, created_by: U.rep, updatedBy: U.rep });
  });
});

// What NewAccountForm and UpdateAccountForm send (industry and price list left empty).
const accountFormFields = (name: string) => ({
  name, office_phone: "1", website: "https://a.example", fax: "2", company_id: "123", vat: "CZ123",
  email: "a@example.com", billing_street: "bs", billing_postal_code: "11000", billing_city: "bc",
  billing_state: "bst", billing_country: "bco", shipping_street: "ss", shipping_postal_code: "12000",
  shipping_city: "sc", shipping_state: "sst", shipping_country: "sco", description: "d",
  assigned_to: U.rep, annual_revenue: "1M", member_of: "group",
});
const otherContactAccount = async () =>
  (await prismadb.crm_Contacts.findUnique({ where: { id: CONTACT.other } }))!.accountsIDs;

describe("createAccount fields", () => {
  const count = (name: string) => prismadb.crm_Accounts.count({ where: { name } });

  it.each<[string, (n: string) => unknown]>([
    ["createdBy", (n) => ({ ...accountFormFields(n), createdBy: U.other })],
    ["v", (n) => ({ ...accountFormFields(n), v: 7 })],
    ["deletedAt", (n) => ({ ...accountFormFields(n), deletedAt: new Date("2026-01-01") })],
    ["relation write on contacts", (n) => ({ ...accountFormFields(n), contacts: { connect: [{ id: CONTACT.other }] } })],
    ["data that is not an object", () => null],
  ])("refuses %s and creates nothing", async (label, payload) => {
    as("rep");
    const n = `acc-${tag}-${label}`;
    expect(await createAccount(loose(payload(n)))).toEqual({ error: "Invalid input" });
    expect(await count(n)).toBe(0);
    expect(await otherContactAccount()).toBe(ACC.other);
  });

  it("refuses an assignee id that is not a uuid and creates nothing", async () => {
    as("rep");
    const n = `acc-${tag}-bad-assignee`;
    expect(await createAccount({ ...accountFormFields(n), assigned_to: "not-a-uuid" })).toEqual({ error: "Forbidden" });
    expect(await count(n)).toBe(0);
  });

  it("creates an account from the fields the form sends, owned by the caller", async () => {
    as("rep");
    const n = `acc-${tag}-ok`;
    expect(await createAccount(accountFormFields(n))).toHaveProperty("data");
    expect(await prismadb.crm_Accounts.findFirst({ where: { name: n } })).toMatchObject({
      ...accountFormFields(n),
      v: 0,
      createdBy: U.rep,
      updatedBy: U.rep,
    });
  });
});

describe("updateAccount fields", () => {
  const row = () => prismadb.crm_Accounts.findUnique({ where: { id: ACC.rep } });

  beforeEach(async () => {
    await prismadb.crm_Accounts.update({
      where: { id: ACC.rep },
      data: { v: 0, createdBy: U.rep, updatedBy: null, deletedAt: null, case_study_approved: false },
    });
  });

  it.each<[string, () => unknown]>([
    ["v", () => ({ v: 7 })],
    ["updatedBy", () => ({ updatedBy: U.other })],
    ["createdBy", () => ({ createdBy: U.other })],
    ["deletedAt", () => ({ deletedAt: new Date("2026-01-01") })],
    ["case_study_approved", () => ({ case_study_approved: true })],
    ["relation write on contacts", () => ({ contacts: { connect: [{ id: CONTACT.other }] } })],
    ["an allowed field next to a refused one", () => ({ name: `x-${tag}`, createdBy: U.other })],
  ])("refuses %s and changes nothing", async (_label, payload) => {
    as("rep");
    const before = await row();
    expect(await updateAccount(loose({ id: ACC.rep, ...(payload() as object) }))).toEqual({ error: "Invalid input" });
    expect(await row()).toEqual(before);
    expect(await otherContactAccount()).toBe(ACC.other);
  });

  it("saves every field the form sends and records the caller", async () => {
    as("rep");
    const fields = accountFormFields(`rep-${tag}`);
    expect(await updateAccount({ id: ACC.rep, ...fields, status: "Active" })).toHaveProperty("data");
    expect(await row()).toMatchObject({ ...fields, status: "Active", v: 0, createdBy: U.rep, updatedBy: U.rep });
  });

  it("treats an empty industry as none", async () => {
    as("rep");
    await prismadb.crm_Accounts.update({ where: { id: ACC.rep }, data: { industry: INDUSTRY } });
    expect(await updateAccount({ id: ACC.rep, industry: "" })).toHaveProperty("data");
    expect(await row()).toMatchObject({ industry: null });
  });

  it("keeps the owner when assigned_to is empty", async () => {
    as("rep");
    expect(await updateAccount({ id: ACC.rep, assigned_to: "" })).toHaveProperty("data");
    expect(await row()).toMatchObject({ assigned_to: U.rep });
  });
});

// What NewContactForm sends (UpdateContactForm sends the same plus id and contact_type_id).
const contactFormFields = (last_name: string) => ({
  birthday_year: "1990", birthday_month: "1", birthday_day: "2", first_name: "f", last_name,
  description: "d", email: "c@example.com", personal_email: "pe@example.com", office_phone: "1",
  mobile_phone: "2", website: "https://w.example", position: "p", status: true,
  assigned_to: U.rep, assigned_account: ACC.rep, social_twitter: "t", social_facebook: "fb",
  social_linkedin: "l", social_skype: "s", social_youtube: "y", social_tiktok: "tt",
});
const savedContactFields = (last_name: string) => {
  const { birthday_year, birthday_month, birthday_day, assigned_account, ...rest } = contactFormFields(last_name);
  return { ...rest, birthday: `${birthday_day}/${birthday_month}/${birthday_year}`, accountsIDs: assigned_account };
};

describe("createContact fields", () => {
  const count = (last_name: string) => prismadb.crm_Contacts.count({ where: { last_name } });

  it.each<[string, (n: string) => unknown]>([
    ["accountsIDs", (n) => ({ ...contactFormFields(n), assigned_account: undefined, accountsIDs: ACC.other })],
    ["createdBy", (n) => ({ ...contactFormFields(n), createdBy: U.other })],
    ["v", (n) => ({ ...contactFormFields(n), v: 7 })],
    ["deletedAt", (n) => ({ ...contactFormFields(n), deletedAt: new Date("2026-01-01") })],
    ["relation write on opportunities", (n) => ({ ...contactFormFields(n), opportunities: { create: [] } })],
    ["data that is not an object", () => null],
  ])("refuses %s and creates nothing", async (label, payload) => {
    as("rep");
    const n = `contact-${tag}-${label}`;
    expect(await createContact(loose(payload(n)))).toEqual({ error: "Invalid input" });
    expect(await count(n)).toBe(0);
  });

  it("creates a contact from every field the form sends, owned by the caller", async () => {
    as("rep");
    const n = `contact-${tag}-ok`;
    expect(await createContact(contactFormFields(n))).toHaveProperty("data");
    expect(await prismadb.crm_Contacts.findFirst({ where: { last_name: n } })).toMatchObject({
      ...savedContactFields(n),
      v: 0,
      createdBy: U.rep,
      updatedBy: U.rep,
    });
  });
});

describe("updateContact fields", () => {
  const row = () => prismadb.crm_Contacts.findUnique({ where: { id: CONTACT.rep } });

  beforeEach(async () => {
    await prismadb.crm_Contacts.update({
      where: { id: CONTACT.rep },
      data: { v: 0, createdBy: U.rep, updatedBy: null, deletedAt: null, accountsIDs: ACC.rep },
    });
  });

  it.each<[string, () => unknown]>([
    ["accountsIDs", () => ({ accountsIDs: ACC.other })],
    ["createdBy", () => ({ createdBy: U.other })],
    ["updatedBy", () => ({ updatedBy: U.other })],
    ["v", () => ({ v: 7 })],
    ["deletedAt", () => ({ deletedAt: new Date("2026-01-01") })],
    ["relation write on opportunities", () => ({ opportunities: { create: [] } })],
    ["an allowed field next to a refused one", () => ({ first_name: `x-${tag}`, accountsIDs: ACC.other })],
  ])("refuses %s and changes nothing", async (_label, payload) => {
    as("rep");
    const before = await row();
    expect(await updateContact(loose({ id: CONTACT.rep, ...(payload() as object) }))).toEqual({ error: "Invalid input" });
    expect(await row()).toEqual(before);
  });

  it("saves every field the form sends, including cleared ones, and records the caller", async () => {
    as("rep");
    const n = `rep-${tag}`;
    expect(
      await updateContact({ id: CONTACT.rep, ...contactFormFields(n), social_tiktok: null })
    ).toHaveProperty("data");
    expect(await row()).toMatchObject({
      ...savedContactFields(n),
      social_tiktok: null,
      v: 0,
      createdBy: U.rep,
      updatedBy: U.rep,
    });
  });
});

// What the campaign wizard sends.
const wizardFields = (name: string) => ({
  name,
  description: "d",
  from_name: "f",
  reply_to: "r@example.com",
  template_id: TPL_REP,
  target_list_ids: [] as string[],
  steps: [
    { order: 0, template_id: TPL_REP, subject: "s0", delay_days: 0, send_to: "all" as const },
    { order: 1, template_id: TPL_REP, subject: "s1", delay_days: 3, send_to: "non_openers" as const },
  ],
});

describe("createCampaign fields", () => {
  const count = (name: string) => prismadb.crm_campaigns.count({ where: { name } });
  const step0 = wizardFields("").steps[0];

  it.each<[string, (n: string) => unknown]>([
    ["created_by", (n) => ({ ...wizardFields(n), created_by: U.other })],
    ["status", (n) => ({ ...wizardFields(n), status: "sent" })],
    ["v", (n) => ({ ...wizardFields(n), v: 7 })],
    ["deletedAt", (n) => ({ ...wizardFields(n), deletedAt: new Date("2026-01-01") })],
    ["relation write on opportunities", (n) => ({ ...wizardFields(n), opportunities: { connect: [] } })],
    ["a step field outside the step schema", (n) => ({ ...wizardFields(n), steps: [{ ...step0, sent_at: new Date("2026-01-01") }] })],
    ["a step send_to outside the list", (n) => ({ ...wizardFields(n), steps: [{ ...step0, send_to: "x" }] })],
    ["empty name", () => wizardFields("")],
    ["data that is not an object", () => null],
  ])("refuses %s and creates nothing", async (label, payload) => {
    as("rep");
    const n = `camp-${tag}-${label}`;
    expect(await createCampaign(loose(payload(n)))).toEqual({ error: "Invalid input" });
    expect(await count(n)).toBe(0);
  });

  it("creates a draft from the wizard fields, owned by the caller", async () => {
    as("rep");
    const n = `camp-${tag}-ok`;
    const { target_list_ids: _lists, steps, ...fields } = wizardFields(n);
    await createCampaign(wizardFields(n));
    const row = await prismadb.crm_campaigns.findFirst({ where: { name: n }, include: { steps: { orderBy: { order: "asc" } } } });
    expect(row).toMatchObject({ ...fields, v: 0, status: "draft", created_by: U.rep });
    expect(row!.steps).toMatchObject(steps);
  });
});

// Linking an activity to a record is a write on that record, on update as on create.
describe("updateActivity links", () => {
  // rep's activity on his account; rep's activity a manager linked to other's account
  const ACT = { rep: randomUUID(), onOther: randomUUID() };
  const links = (id: string) =>
    prismadb.crm_ActivityLinks.findMany({ where: { activityId: id }, select: { entityType: true, entityId: true } });

  beforeEach(async () => {
    for (const [k, account] of [["rep", ACC.rep], ["onOther", ACC.other]] as const) {
      await prismadb.crm_Activities.upsert({
        where: { id: ACT[k] },
        create: { id: ACT[k], type: "note", title: `${k}-${tag}`, date: new Date("2026-01-01"), status: "completed", createdBy: U.rep },
        update: {},
      });
      await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: ACT[k] } });
      await prismadb.crm_ActivityLinks.create({ data: { activityId: ACT[k], entityType: "account", entityId: account } });
    }
  });

  it.each<[string, { entityType: string; entityId: string }]>([
    ["another user's account", { entityType: "account", entityId: ACC.other }],
    ["another user's contact", { entityType: "contact", entityId: CONTACT.other }],
    ["an unknown entity type", { entityType: "constructor", entityId: ACC.rep }],
  ])("user cannot link his activity to %s", async (_label, link) => {
    as("rep");
    expect(await updateActivity({ id: ACT.rep, links: [link] })).toEqual({ error: "Forbidden" });
    expect(await links(ACT.rep)).toEqual([{ entityType: "account", entityId: ACC.rep }]);
  });

  it("user can relink to his own records", async () => {
    as("rep");
    const next = [{ entityType: "contact", entityId: CONTACT.rep }];
    expect(await updateActivity({ id: ACT.rep, links: next })).toHaveProperty("data");
    expect(await links(ACT.rep)).toEqual(next);
  });

  it("user can still edit his activity when the form resends a link he did not add", async () => {
    as("rep");
    const same = [{ entityType: "account", entityId: ACC.other }];
    expect(await updateActivity({ id: ACT.onOther, title: `onOther-${tag}-edited`, links: same })).toHaveProperty("data");
    expect(await links(ACT.onOther)).toEqual(same);
  });

  it("manager can link to any record", async () => {
    as("boss");
    const next = [{ entityType: "account", entityId: ACC.other }];
    expect(await updateActivity({ id: ACT.rep, links: next })).toHaveProperty("data");
    expect(await links(ACT.rep)).toEqual(next);
  });
});

// The campaign wizard offers the target lists the caller can read elsewhere.
describe("campaigns/new target lists", () => {
  const LIST = { rep: randomUUID(), repDeleted: randomUUID(), other: randomUUID() };

  beforeAll(async () => {
    (global as unknown as { React: unknown }).React = jest.requireActual("react");
    for (const [k, owner, deletedAt] of [
      ["rep", U.rep, null], ["repDeleted", U.rep, new Date("2026-01-01")], ["other", U.other, null],
    ] as const) {
      await prismadb.crm_TargetLists.create({ data: { id: LIST[k], name: `${k}-${tag}`, status: true, created_by: owner, deletedAt } });
    }
  });

  afterAll(async () => {
    await prismadb.crm_TargetLists.deleteMany({ where: { id: { in: Object.values(LIST) } } });
  });

  // The page renders <WizardShell targetLists={...} />; read the prop.
  const offered = async () => {
    const findProps = (node: unknown): { targetLists: { id: string }[] } | undefined => {
      if (!node || typeof node !== "object") return undefined;
      const props = (node as { props?: Record<string, unknown> }).props;
      if (props?.targetLists) return props as { targetLists: { id: string }[] };
      return ([] as unknown[]).concat(props?.children ?? []).map(findProps).find(Boolean);
    };
    const ids = findProps(await NewCampaignPage())!.targetLists.map((l) => l.id);
    return Object.values(LIST).filter((id) => ids.includes(id));
  };

  it("user sees only his own lists that are not deleted", async () => {
    as("rep");
    expect(await offered()).toEqual([LIST.rep]);
  });

  it("manager sees every list that is not deleted", async () => {
    as("boss");
    expect((await offered()).sort()).toEqual([LIST.rep, LIST.other].sort());
  });
});

// The assignee must be a real, active user, as on accounts.
describe("contact assigned_to", () => {
  const assigneeOf = async (id: string) =>
    (await prismadb.crm_Contacts.findUnique({ where: { id }, select: { assigned_to: true } }))!.assigned_to;
  const count = (last_name: string) => prismadb.crm_Contacts.count({ where: { last_name } });

  beforeEach(async () => {
    await prismadb.crm_Contacts.update({ where: { id: CONTACT.rep }, data: { assigned_to: U.rep } });
  });

  it.each<[string, string]>([
    ["an inactive assignee", U.gone],
    ["an assignee id that is no user", randomUUID()],
  ])("createContact refuses %s and creates nothing", async (label, assignee) => {
    as("rep");
    const n = `contact-${tag}-assignee-${label}`;
    expect(await createContact({ ...contactFormFields(n), assigned_to: assignee })).toEqual({ error: "Forbidden" });
    expect(await count(n)).toBe(0);
  });

  it("createContact assigns to another active user", async () => {
    as("rep");
    const n = `contact-${tag}-assignee-active`;
    await createContact({ ...contactFormFields(n), assigned_to: U.other });
    expect((await prismadb.crm_Contacts.findFirst({ where: { last_name: n } }))!.assigned_to).toBe(U.other);
  });

  it.each<[string, string]>([
    ["an inactive assignee", U.gone],
    ["an assignee id that is no user", randomUUID()],
  ])("updateContact refuses %s and leaves the assignee", async (_label, assignee) => {
    as("rep");
    expect(await updateContact({ id: CONTACT.rep, assigned_to: assignee })).toEqual({ error: "Forbidden" });
    expect(await assigneeOf(CONTACT.rep)).toBe(U.rep);
  });

  it("updateContact still saves when the form resends the current (inactive) assignee", async () => {
    await prismadb.crm_Contacts.update({ where: { id: CONTACT.rep }, data: { assigned_to: U.gone } });
    as("rep");
    expect(await updateContact({ id: CONTACT.rep, assigned_to: U.gone, first_name: "kept" })).toHaveProperty("data");
    expect(await assigneeOf(CONTACT.rep)).toBe(U.gone);
  });
});

// A partner's activity must keep at least one link on a record he may edit.
describe("updateActivity partner links", () => {
  const PACC = randomUUID();
  const PACT = randomUUID();
  const links = () =>
    prismadb.crm_ActivityLinks.findMany({ where: { activityId: PACT }, select: { entityType: true, entityId: true } });
  const own = [{ entityType: "account", entityId: PACC }];

  beforeAll(async () => {
    await prismadb.crm_Accounts.create({
      data: { id: PACC, v: 0, name: `pacc-${tag}`, assigned_to: U.rep, createdBy: U.rep, partnerUserId: U.partner },
    });
    await prismadb.crm_Activities.create({
      data: { id: PACT, type: "note", title: `pact-${tag}`, date: new Date("2026-01-01"), status: "completed", createdBy: U.partner },
    });
  });

  beforeEach(async () => {
    await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: PACT } });
    await prismadb.crm_ActivityLinks.create({ data: { activityId: PACT, ...own[0] } });
  });

  it("partner cannot remove every link", async () => {
    as("partner");
    expect(await updateActivity({ id: PACT, links: [] })).toEqual({ error: "Forbidden" });
    expect(await links()).toEqual(own);
  });

  it("partner cannot link to a record he may not edit", async () => {
    as("partner");
    expect(await updateActivity({ id: PACT, links: [...own, { entityType: "account", entityId: ACC.rep }] })).toEqual({ error: "Forbidden" });
    expect(await links()).toEqual(own);
  });

  it("partner can save with his link resent", async () => {
    as("partner");
    expect(await updateActivity({ id: PACT, title: `pact-${tag}-edited`, links: own })).toHaveProperty("data");
    expect(await links()).toEqual(own);
  });
});

describe("report schedule fields", () => {
  let configId: string;
  let scheduleId: string;
  const valid = { cronExpression: "0 9 * * 1", recipients: ["a@example.com"], format: "pdf" as const };

  beforeAll(async () => {
    const cfg = await prismadb.crm_Report_Config.create({
      data: { name: `cfg-${tag}`, category: "sales", filters: {}, createdBy: U.rep },
    });
    configId = cfg.id;
    const sched = await prismadb.crm_Report_Schedule.create({
      data: { reportConfigId: configId, ...valid, createdBy: U.rep },
    });
    scheduleId = sched.id;
  });

  it.each<[string, unknown]>([
    ["relation write on user", { user: { update: { role: "admin" } } }],
    ["createdBy", { createdBy: U.other }],
    ["recipients that are not emails", { recipients: [{ x: 1 }] }],
    ["unknown format", { format: "xml" }],
    ["data that is not an object", null],
  ])("updateSchedule refuses %s and changes nothing", async (_label, payload) => {
    as("rep");
    await expect(updateSchedule(scheduleId, loose(payload))).rejects.toThrow("Invalid input");
    expect(await prismadb.users.findUnique({ where: { id: U.rep } })).toMatchObject({ role: "user" });
    expect(await prismadb.crm_Report_Schedule.findUnique({ where: { id: scheduleId } })).toMatchObject({
      ...valid,
      createdBy: U.rep,
    });
  });

  it("updateSchedule refuses an id that is not a string", async () => {
    as("rep");
    await expect(updateSchedule(loose({ in: [scheduleId] }), { isActive: false })).rejects.toThrow();
    expect(await prismadb.crm_Report_Schedule.findUnique({ where: { id: scheduleId } })).toMatchObject({ isActive: true });
  });

  it("updateSchedule writes the declared fields", async () => {
    as("rep");
    await updateSchedule(scheduleId, { isActive: false, recipients: ["b@example.com"], format: "csv", cronExpression: "0 8 * * *" });
    expect(await prismadb.crm_Report_Schedule.findUnique({ where: { id: scheduleId } })).toMatchObject({
      isActive: false, recipients: ["b@example.com"], format: "csv", cronExpression: "0 8 * * *",
    });
  });

  it.each<[string, (configId: string) => unknown]>([
    ["extra key", (c) => ({ reportConfigId: c, ...valid, user: { update: { role: "admin" } } })],
    ["recipients that are not emails", (c) => ({ reportConfigId: c, ...valid, recipients: [{ x: 1 }] })],
    ["unknown format", (c) => ({ reportConfigId: c, ...valid, format: "xml" })],
    ["config id that is not a string", (c) => ({ reportConfigId: { in: [c] }, ...valid })],
  ])("createSchedule refuses %s and creates nothing", async (_label, payload) => {
    as("rep");
    const before = await prismadb.crm_Report_Schedule.count({ where: { reportConfigId: configId } });
    await expect(createSchedule(loose(payload(configId)))).rejects.toThrow();
    expect(await prismadb.crm_Report_Schedule.count({ where: { reportConfigId: configId } })).toBe(before);
    expect(await prismadb.users.findUnique({ where: { id: U.rep } })).toMatchObject({ role: "user" });
  });

  it("createSchedule creates a schedule from the dialog fields, owned by the caller", async () => {
    as("rep");
    const s = await createSchedule({ reportConfigId: configId, ...valid });
    expect(s).toMatchObject({ reportConfigId: configId, ...valid, createdBy: U.rep });
  });
});
