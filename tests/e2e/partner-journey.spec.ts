import { test, expect, Page, APIRequestContext } from "@playwright/test";
import { randomUUID } from "crypto";
import { prismaBase as db } from "../../lib/prisma-base";

/**
 * The whole partner journey (partner-role spec, ticket 4). Fixture: partner A
 * and partner B, an internal rep, four accounts (A's, B's, an internal one and
 * A's own company account). A signs in with the test OTP and must see only his
 * accounts, his own account read-only (record, contacts, orders, invoices),
 * add a contact and a lead to his account, create an account (he becomes its
 * partner, no owner), and be refused everything else on the server.
 */

const tag = randomUUID().slice(0, 8);
const U = { A: randomUUID(), B: randomUUID(), rep: randomUUID() };
const ACC = { A: randomUUID(), B: randomUUID(), internal: randomUUID(), own: randomUUID() };
const name = (k: string) => `${k}-${tag}`;
const emailA = `a-${tag}@partner.test`;

async function signIn(api: APIRequestContext, email: string) {
  await db.verification.deleteMany({ where: { identifier: `test-otp-${email}` } });
  const send = await api.post("/api/auth/email-otp/send-verification-otp", { data: { email, type: "sign-in" } });
  expect(send.ok()).toBeTruthy();
  let otp: string | null = null;
  for (let i = 0; i < 10 && !otp; i++) {
    const res = await api.get(`/api/auth/test-otp?email=${encodeURIComponent(email)}`);
    if (res.ok()) otp = (await res.json()).otp;
    else await new Promise((r) => setTimeout(r, 500));
  }
  const res = await api.post("/api/auth/sign-in/email-otp", { data: { email, otp } });
  expect(res.ok()).toBeTruthy();
}

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', { timeout: 10000 });
}

test.describe.serial("partner journey", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    await db.users.createMany({
      data: [
        { id: U.A, email: emailA, name: name("partnerA"), role: "partner", userStatus: "ACTIVE" },
        { id: U.B, email: `b-${tag}@partner.test`, name: name("partnerB"), role: "partner", userStatus: "ACTIVE" },
        { id: U.rep, email: `rep-${tag}@partner.test`, name: name("rep"), role: "user", userStatus: "ACTIVE" },
      ],
    });
    const partnerOf: Record<string, string | null> = { A: U.A, B: U.B, internal: null, own: null };
    for (const [k, id] of Object.entries(ACC)) {
      await db.crm_Accounts.create({
        data: { id, v: 0, name: name(`acc${k}`), assigned_to: U.rep, createdBy: U.rep, partnerUserId: partnerOf[k] },
      });
    }
    await db.users.update({ where: { id: U.A }, data: { partnerAccountId: ACC.own } });

    // His own account: a contact, an order and an invoice he may see, a lead he may not.
    const currency = (await db.currency.findFirst({ select: { code: true } }))!.code;
    const series = await db.numberSeries.create({ data: { scope: "order", name: name("series"), template: `T${tag}-{n}` } });
    await db.crm_Contacts.create({ data: { last_name: name("ownContact"), accountsIDs: ACC.own, assigned_to: U.rep, createdBy: U.rep } });
    await db.crm_Leads.create({ data: { lastName: name("ownLead"), accountsIDs: ACC.own, assigned_to: U.rep, createdBy: U.rep } });
    await db.crm_Orders.create({
      data: { number: name("ownOrder"), seriesId: series.id, accountId: ACC.own, currency, ownerId: U.rep, createdBy: U.rep },
    });
    await db.invoices.create({ data: { number: name("ownInvoice"), accountId: ACC.own, createdBy: U.rep, currency } });

    const context = await browser.newContext();
    await signIn(context.request, emailA);
    page = await context.newPage();
  });

  test.afterAll(async () => {
    const accounts = { OR: [{ id: { in: Object.values(ACC) } }, { partnerUserId: U.A }] };
    const accountIds = (await db.crm_Accounts.findMany({ where: accounts, select: { id: true } })).map((a) => a.id);
    await db.invoices.deleteMany({ where: { accountId: { in: accountIds } } });
    await db.crm_Orders.deleteMany({ where: { accountId: { in: accountIds } } });
    await db.numberSeries.deleteMany({ where: { name: name("series") } });
    await db.crm_Leads.deleteMany({ where: { accountsIDs: { in: accountIds } } });
    await db.crm_Contacts.deleteMany({ where: { accountsIDs: { in: accountIds } } });
    await db.users.update({ where: { id: U.A }, data: { partnerAccountId: null } });
    await db.crm_Accounts.deleteMany({ where: { id: { in: accountIds } } });
    await db.session.deleteMany({ where: { userId: { in: Object.values(U) } } });
    await db.users.deleteMany({ where: { id: { in: Object.values(U) } } });
    await page?.context().close();
  });

  test("navigation shows only the partner modules", async () => {
    await page.goto("/en");
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar.getByText("Sales", { exact: true })).toBeVisible({ timeout: 20000 });
    for (const hidden of ["Projects", "Campaigns", "Emails", "Reports", "Documents", "Invoices", "Administration", "Plugins"]) {
      await expect(sidebar.getByText(hidden, { exact: true })).toHaveCount(0);
    }
    await sidebar.getByText("Sales", { exact: true }).click();
    const links = await sidebar.locator("a[href]").evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
    expect(links.filter((p) => p.includes("/crm/")).map((p) => p.replace(/^\/en/, "")).sort()).toEqual(
      ["/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities", "/crm/orders"]
    );
  });

  test("accounts list shows his partner account and his own account only", async () => {
    await page.goto("/en/crm/accounts");
    const table = page.getByTestId("accounts-table");
    await expect(table.getByText(name("accA"))).toBeVisible({ timeout: 20000 });
    await expect(table.getByText(name("accown"))).toBeVisible();
    await expect(table.getByText(name("accB"))).toHaveCount(0);
    await expect(table.getByText(name("accinternal"))).toHaveCount(0);
  });

  test("own account shows its contacts, orders and invoices, not its leads", async () => {
    await page.goto(`/en/crm/accounts/${ACC.own}`);
    await expect(page.getByText(name("accown")).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(name("ownContact")).first()).toBeVisible();
    await expect(page.getByText(name("ownInvoice")).first()).toBeVisible();
    await expect(page.getByText(name("ownLead"))).toHaveCount(0);
    await page.getByRole("tab", { name: "Orders" }).click();
    await expect(page.getByText(name("ownOrder")).first()).toBeVisible({ timeout: 10000 });
  });

  test("adds a contact and a lead to his partner account", async () => {
    await page.goto(`/en/crm/accounts/${ACC.A}`);
    await expect(page.getByText(name("accA")).first()).toBeVisible({ timeout: 20000 });

    await page.getByTestId("add-contact-btn").click();
    await waitForSheet(page);
    await page.getByLabel("Last name").fill(name("newContact"));
    await page.getByTestId("contact-submit-btn").click();
    await expect.poll(() => db.crm_Contacts.count({ where: { last_name: name("newContact"), accountsIDs: ACC.A } }), { timeout: 15000 }).toBe(1);
    await page.keyboard.press("Escape");

    await page.getByTestId("add-lead-btn").click();
    await waitForSheet(page);
    await page.getByLabel("Last name").fill(name("newLead"));
    await page.getByTestId("lead-submit-btn").click();
    await expect.poll(() => db.crm_Leads.count({ where: { lastName: name("newLead"), accountsIDs: ACC.A } }), { timeout: 15000 }).toBe(1);
  });

  test("creates an account: he is its partner, it has no owner", async () => {
    await page.goto("/en/crm/accounts");
    await page.getByTestId("add-account-btn").click();
    await waitForSheet(page);
    await page.getByLabel("Account name").fill(name("created"));
    await page.getByTestId("account-submit-btn").click();
    await expect.poll(() => db.crm_Accounts.count({ where: { name: name("created") } }), { timeout: 15000 }).toBe(1);
    const created = await db.crm_Accounts.findFirstOrThrow({ where: { name: name("created") } });
    expect(created.partnerUserId).toBe(U.A);
    expect(created.assigned_to).toBeNull();
  });

  test("his module pages render without errors", async () => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const contact = await db.crm_Contacts.findFirstOrThrow({ where: { last_name: name("ownContact") } });
    const lead = await db.crm_Leads.findFirstOrThrow({ where: { lastName: name("newLead") } });
    const order = await db.crm_Orders.findFirstOrThrow({ where: { number: name("ownOrder") } });
    const pages: [string, string][] = [
      ["/en/crm/contacts", "Contacts"],
      ["/en/crm/leads", "Leads"],
      ["/en/crm/opportunities", "Opportunities"],
      ["/en/crm/orders", name("ownOrder")],
      [`/en/crm/contacts/${contact.id}`, name("ownContact")],
      [`/en/crm/leads/${lead.id}`, name("newLead")],
      [`/en/crm/orders/${order.id}`, name("ownOrder")],
    ];
    for (const [path, text] of pages) {
      await page.goto(path);
      await expect(page.getByText(text).first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText("Runtime Error")).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });

  test("cannot open an internal account or partner B's account by URL", async () => {
    for (const k of ["internal", "B"] as const) {
      await page.goto(`/en/crm/accounts/${ACC[k]}`);
      await expect(page.getByText("Account not found")).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(name(`acc${k}`))).toHaveCount(0);
    }
  });

  test("admin, campaigns, projects and other modules redirect to his dashboard", async () => {
    for (const path of ["/en/admin", "/en/admin/users", "/en/campaigns", "/en/projects", "/en/reports", "/en/documents", "/en/invoices", "/en/profile", "/en/crm/products", "/en/fulltext-search"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/en\/?$/, { timeout: 20000 });
    }
  });

  test("API routes outside his modules answer 403", async () => {
    const res = await page.context().request.post("/api/upload/presigned-url", { data: {} });
    expect(res.status()).toBe(403);
    const exportRes = await page.context().request.get("/api/reports/export");
    expect(exportRes.status()).toBe(403);
  });
});
