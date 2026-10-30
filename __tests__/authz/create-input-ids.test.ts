/**
 * Ids a UI action takes from its input must point at something the caller may
 * use: an assignee must be an active user, a parent account one the caller can
 * read, a price list one that exists. DB-backed: CI runs it in the
 * integration job.
 *
 * Fixture: plain users `rep` and `other`, an inactive user `gone`; one
 * account each for rep and other; one price list. Real actions are called as
 * `rep` (session mocked, role read from the DB).
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { createNewContract } from "@/actions/crm/contracts/create-new-contract";
import { updateContract } from "@/actions/crm/contracts/update-contract";

const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), other: randomUUID(), gone: randomUUID() };
const ACC = { rep: randomUUID(), other: randomUUID() };
const PRICELIST = randomUUID();
// rep's contract assigned to other; rep's contract still assigned to the now inactive `gone`
const CONTRACT = { rep: randomUUID(), repGone: randomUUID() };
const NOBODY = randomUUID();

const accountsNamed = (name: string) => prismadb.crm_Accounts.count({ where: { name } });
const contractsTitled = (title: string) => prismadb.crm_Contracts.count({ where: { title } });

beforeAll(async () => {
  await prismadb.users.createMany({
    data: (["rep", "other", "gone"] as const).map((k) => ({
      id: U[k], email: `${k}-${tag}@input-ids.test`, name: `${k}-${tag}`, role: "user",
      userStatus: k === "gone" ? "INACTIVE" : "ACTIVE",
    })),
  });
  for (const k of ["rep", "other"] as const) {
    await prismadb.crm_Accounts.create({
      data: { id: ACC[k], v: 0, name: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
  }
  await prismadb.crm_PriceLists.create({ data: { id: PRICELIST, name: `pl-${tag}`, currency: "EUR" } });
  for (const [k, assignee] of [["rep", U.other], ["repGone", U.gone]] as const) {
    await prismadb.crm_Contracts.create({
      data: { id: CONTRACT[k], v: 0, title: `${k}-${tag}`, value: 1, account: ACC.rep, assigned_to: assignee, createdBy: U.rep },
    });
  }
  (getSession as jest.Mock).mockResolvedValue({ user: { id: U.rep } });
});

afterAll(async () => {
  const names = [`rep-${tag}`, `other-${tag}`].concat(["ok", "gone", "nobody", "member", "pricelist"].map((n) => `${n}-${tag}`));
  await prismadb.crm_Contracts.deleteMany({ where: { createdBy: U.rep } });
  await prismadb.crm_Accounts.deleteMany({ where: { name: { in: names } } });
  await prismadb.crm_PriceLists.deleteMany({ where: { id: PRICELIST } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

describe("createAccount", () => {
  it("refuses an inactive assignee and creates nothing", async () => {
    expect(await createAccount({ name: `gone-${tag}`, assigned_to: U.gone })).toEqual({ error: "Forbidden" });
    expect(await accountsNamed(`gone-${tag}`)).toBe(0);
  });

  it("refuses an assignee id that is no user", async () => {
    expect(await createAccount({ name: `nobody-${tag}`, assigned_to: NOBODY })).toEqual({ error: "Forbidden" });
    expect(await accountsNamed(`nobody-${tag}`)).toBe(0);
  });

  it("refuses a parent account (member_of) the caller cannot read", async () => {
    expect(await createAccount({ name: `member-${tag}`, member_of: ACC.other })).toEqual({ error: "Forbidden" });
    expect(await accountsNamed(`member-${tag}`)).toBe(0);
  });

  it("refuses a price list that does not exist", async () => {
    expect(await createAccount({ name: `pricelist-${tag}`, pricelist_id: NOBODY })).toEqual({ error: "Price list not found" });
    expect(await accountsNamed(`pricelist-${tag}`)).toBe(0);
  });

  it("creates the account with an active assignee, a readable parent and an existing price list", async () => {
    const r = await createAccount({ name: `ok-${tag}`, assigned_to: U.other, member_of: ACC.rep, pricelist_id: PRICELIST });
    expect(r).toHaveProperty("data");
    const row = await prismadb.crm_Accounts.findFirstOrThrow({ where: { name: `ok-${tag}` } });
    expect({ assigned_to: row.assigned_to, member_of: row.member_of, pricelist_id: row.pricelist_id })
      .toEqual({ assigned_to: U.other, member_of: ACC.rep, pricelist_id: PRICELIST });
  });
});

describe("contracts assigned_to", () => {
  const d = new Date("2026-01-01");
  const fields = (title: string, assigned_to: string) => ({
    title, value: "1", startDate: d, endDate: d, renewalReminderDate: d, customerSignedDate: d, companySignedDate: d,
    description: "", account: ACC.rep, assigned_to,
  });
  const update = (id: string, title: string, assigned_to: string) =>
    updateContract({ id, v: 0, status: "NOTSTARTED" as any, ...fields(title, assigned_to) });
  const assigneeOf = async (id: string) =>
    (await prismadb.crm_Contracts.findUniqueOrThrow({ where: { id }, select: { assigned_to: true } })).assigned_to;

  it("createNewContract refuses an inactive assignee and creates nothing", async () => {
    expect(await createNewContract(fields(`c-gone-${tag}`, U.gone))).toEqual({ error: "Forbidden" });
    expect(await contractsTitled(`c-gone-${tag}`)).toBe(0);
  });

  it("createNewContract refuses an assignee id that is no user", async () => {
    expect(await createNewContract(fields(`c-nobody-${tag}`, NOBODY))).toEqual({ error: "Forbidden" });
    expect(await contractsTitled(`c-nobody-${tag}`)).toBe(0);
  });

  it("createNewContract accepts an active assignee", async () => {
    expect(await createNewContract(fields(`c-ok-${tag}`, U.other))).toEqual({ data: { title: `c-ok-${tag}` } });
  });

  it("updateContract refuses reassigning to an inactive user and leaves the assignee", async () => {
    expect(await update(CONTRACT.rep, `rep-${tag}`, U.gone)).toEqual({ error: "Forbidden" });
    expect(await assigneeOf(CONTRACT.rep)).toBe(U.other);
  });

  it("updateContract still saves when the form resends the current (inactive) assignee", async () => {
    expect(await update(CONTRACT.repGone, `repGone-edited-${tag}`, U.gone)).toEqual({ data: { title: `repGone-edited-${tag}` } });
  });
});
