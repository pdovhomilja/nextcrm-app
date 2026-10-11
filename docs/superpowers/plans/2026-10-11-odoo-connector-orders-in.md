# Odoo connector part 3b: Odoo orders in, account tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirmed Odoo orders of linked customers become read-only CRM orders with their real status, and the account gets an Odoo tab with orders, open invoices and yearly totals.

**Architecture:** A new `orders-in.ts` runs inside `runSync` after the status check: it reads confirmed orders of linked customers, imports the ones the CRM has no `odooOrder:` index for (through the SDK's `orders.create`), and `customer-info.ts` stores open invoices and totals per account. The existing status check keeps imported orders current and refreshes their lines. The tab reads only storage and CRM data.

**Tech Stack:** TypeScript, Next.js server components, `@nextcrm/plugin-sdk` 0.2.4, Odoo 19 JSON-2 API, jest with the fake Odoo in `plugins/odoo-connector/__tests__`.

**Spec:** `docs/superpowers/specs/2026-10-11-odoo-connector-orders-in-design.md`

## Global Constraints

- No core or SDK change; plugin `odoo-connector` becomes `0.4.0`, `sdk: "^0.2.4"`, permissions unchanged.
- This part never writes to Odoo. In dry run it writes nothing to the CRM or the plugin store either.
- Only confirmed Odoo orders (`state in (sale, done)`) of customers with a `partner:` link; the customer is the order partner's `commercial_partner_id`.
- Lines: `display_type = false`, `is_downpayment = false`, product linked by the catalog (`product:<odooId>`); anything else skipped; unknown products counted in the note.
- At most 200 imports per run, oldest Odoo id first.
- An Odoo order the connector cannot find is never cancelled (PR #372 rule).
- All new texts in en, cz, de, uk (`plugins/odoo-connector/messages/*.json`), same keys in every file.
- Times shown with `localTime(ctx, iso)` from `settings.ts`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; never `git add -A`; check the branch (`feat/odoo-connector-orders-in`) in every commit command.

## Review Focus

1. An order placed on a child delivery contact must land on the parent customer's account (Task 2 test "imports an order placed on a delivery contact into the customer's account").
2. Odoo's note is HTML or `false`; the CRM note must be plain text or null, never `"false"` or tags (Task 2 test "turns Odoo's HTML note into plain text").
3. More than 200 new orders: the rest must come on the next run, none twice (Task 2 test "imports at most 200 per run and the rest next run").
4. Imported orders must not count as "sent in the last 7 days" on the admin page (Task 5 test "does not count imported orders as sent").
5. A dry run on an instance that already sent orders (3a) must not list those as "would import" (Task 2 test "dry run skips orders the CRM sent, writes nothing").

## Rulings against the spec

- **R1 (spec § 4.5 totals):** totals are summed in code from the order list the import already reads (it has `amount_untaxed`, `date_order`, `currency_id`), not with `read_group`. One Odoo call fewer, no dependency on Odoo 19's changed `read_group` API. Same numbers.
- **R2 (spec § 3.1 `meta:imported`):** stores `{ lastRun }` only; the total is counted from `order:` links when the admin page renders, so it can never drift.
- **R3 (spec § 4.6 "All orders in Odoo"):** links to the customer's form in Odoo (`/odoo/contacts/<id>`, which has the Sales button); the spec allows this fallback.

## File Structure

| File | Responsibility |
|---|---|
| `plugins/odoo-connector/store.ts` (modify) | new keys `odooOrder`, `importFailed`, `customer`, `imported`; `OrderLink` fields; `ImportFailed`, `OpenInvoice`, `CustomerInfo` types; `RunSummary.orders.imported` |
| `plugins/odoo-connector/orders-out.ts` (modify) | writes `odooOrder:` when a sent order is linked |
| `plugins/odoo-connector/orders-status.ts` (modify) | exports `MOVE_FIELDS`, `invoiceRows`; keeps imported orders' lines current; notices a changed customer |
| `plugins/odoo-connector/orders-in.ts` (create) | linked customers, confirmed orders, commercial partners, line mapping, import, `syncOrdersIn` |
| `plugins/odoo-connector/customer-info.ts` (create) | open invoices and yearly totals per linked account |
| `plugins/odoo-connector/sync.ts` (modify) | runs `syncOrdersIn` after the status check; `summaryText` shows imports |
| `plugins/odoo-connector/settings.ts` (modify) | `localDay(ctx, date)` |
| `plugins/odoo-connector/ui/data.ts` (modify) | `accountTabData`; `ordersData` gains imports, excludes imported from "sent" |
| `plugins/odoo-connector/ui/AccountTab.tsx` (create) | the tab |
| `plugins/odoo-connector/ui/OrderPanel.tsx`, `ui/AdminSection.tsx` (modify) | imported / moved lines; imports block |
| `plugins/odoo-connector/plugin.ts` (modify) | `accountTab`, version, description |
| `plugins/odoo-connector/messages/{en,cz,de,uk}.json` (modify) | texts |
| `apps/docs/content/docs/admins/plugins/odoo-connector.mdx` (modify) | "Orders from Odoo" section |
| `plugins/odoo-connector/__tests__/orders-helpers.ts` (modify) | fake Odoo: related-path domains on `sale.order`, `res.partner/read` with `commercial_partner_id` |
| `plugins/odoo-connector/__tests__/orders-in.test.ts`, `customer-info.test.ts`, `account-tab.test.ts` (create) | tests |

Test command for the connector: `pnpm exec jest plugins/odoo-connector`. Whole suite: `pnpm exec jest` with the CI env (`. <scratchpad>/ci-env.sh`); the invoice lifecycle suite needs the CI database on :5432 and may be skipped locally (CI runs it).

---

### Task 1: Storage and the shared order index

**Files:**
- Modify: `plugins/odoo-connector/store.ts`
- Modify: `plugins/odoo-connector/orders-out.ts` (in `send`, after `await ctx.store.set(K.order(id), link);`)
- Test: `plugins/odoo-connector/__tests__/orders-in.test.ts`

**Interfaces:**
- Produces: `K.odooOrder(id: number)`, `K.importFailed(id: number)`, `K.customer(accountId: string)`, `K.imported`; types `ImportFailed { name: string; reason: string; at: string }`, `OpenInvoice { number: string; type: "out_invoice" | "out_refund"; date: string | null; due: string | null; currency: string; amount: number; residual: number }`, `CustomerInfo { at: string; invoices: OpenInvoice[]; totals: { year: number; currency: string; amount: number }[] }`; `OrderLink` optional `imported?: boolean; partnerId?: number; writeDate?: string; movedNotified?: boolean`; `RunSummary.orders?: { checked: number; moved: number; imported?: number }`.

- [ ] **Step 1: Write the failing test** — create `plugins/odoo-connector/__tests__/orders-in.test.ts`:

```ts
import { sendOrder } from "../orders-out";
import { K } from "../store";
import { mkOrders } from "./orders-helpers";
import { now } from "./helpers";

describe("shared order index", () => {
  it("a sent order is indexed by its Odoo id", async () => {
    const { ctx, client } = mkOrders({ sales: { partners: [{ id: 50, name: "Bubble s.r.o.", parent_id: false, active: true, type: "contact", property_product_pricelist: [234, "Retail (CZK)"] }] } });
    await ctx.store.set(K.account("a1"), { partnerId: 50, syncedAt: "x", salesperson: null });
    await sendOrder(ctx, client, "o1", now);
    expect(await ctx.store.get(K.odooOrder(1000))).toEqual({ orderId: "o1" });
  });
});
```

- [ ] **Step 2: Run it** — `pnpm exec jest plugins/odoo-connector/__tests__/orders-in.test.ts`. Expected: FAIL, `K.odooOrder is not a function`.

- [ ] **Step 3: Implement.** In `store.ts`, inside `K` after `created: "meta:created", …` add:

```ts
  odooOrder: (id: number) => `odooOrder:${id}`,       // → { orderId } the CRM order of an Odoo order, sent or imported
  importFailed: (id: number) => `importFailed:${id}`, // → ImportFailed while an Odoo order cannot be imported
  customer: (accountId: string) => `customer:${accountId}`, // → CustomerInfo for the account tab
  imported: "meta:imported",                          // → { lastRun } orders imported on the last run
```

In `RunSummary` replace `orders?: { checked: number; moved: number };` with `orders?: { checked: number; moved: number; imported?: number };`. In `OrderLink` after `missingNotified?: boolean;` add:

```ts
  imported?: boolean;      // came from Odoo (part 3b)
  partnerId?: number;      // the Odoo customer at import
  writeDate?: string;      // Odoo write_date when the lines were last copied
  movedNotified?: boolean; // the Odoo order now belongs to another customer; admins told
```

At the end of the file add:

```ts
export interface ImportFailed { name: string; reason: string; at: string }
export interface OpenInvoice { number: string; type: "out_invoice" | "out_refund"; date: string | null; due: string | null; currency: string; amount: number; residual: number }
export interface CustomerInfo { at: string; invoices: OpenInvoice[]; totals: { year: number; currency: string; amount: number }[] }
```

In `orders-out.ts` `send`, directly after `await ctx.store.set(K.order(id), link);` add:

```ts
  await ctx.store.set(K.odooOrder(sale.id), { orderId: id });
```

In `sync.ts` the local `RunSummary` copy (line ~34, `orders?: { checked: number; moved: number };`) gets the same `imported?: number`.

- [ ] **Step 4: Run it** — same command. Expected: PASS. Then `pnpm exec jest plugins/odoo-connector`: all pass.

- [ ] **Step 5: Commit**

```bash
test "$(git branch --show-current)" = feat/odoo-connector-orders-in && git add plugins/odoo-connector/store.ts plugins/odoo-connector/orders-out.ts plugins/odoo-connector/sync.ts plugins/odoo-connector/__tests__/orders-in.test.ts && git commit -m "feat(odoo-connector): storage for imported orders, shared Odoo order index

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Importing confirmed Odoo orders

**Files:**
- Create: `plugins/odoo-connector/orders-in.ts`
- Modify: `plugins/odoo-connector/orders-status.ts` (export `MOVE_FIELDS` and a new `invoiceRows`)
- Modify: `plugins/odoo-connector/__tests__/orders-helpers.ts` (fake Odoo)
- Modify: `plugins/odoo-connector/messages/{en,cz,de,uk}.json` (`orders.linesMissing`)
- Test: `plugins/odoo-connector/__tests__/orders-in.test.ts`

**Interfaces:**
- Consumes: Task 1 keys and types; `targetStatus(sale: OdooSale, moves: OdooMove[])`, `OdooSale`, `OdooMove` from `orders-status.ts`; `availableFields(client, model, wanted)` from `catalog.ts`.
- Produces (all exported from `orders-in.ts`):
  - `interface OdooOrderIn extends OdooSale { partner_id: M2O; origin: string | false; date_order: string; currency_id: M2O; note: string | false; write_date: string; amount_untaxed: number }`
  - `interface OdooLineIn { id: number; order_id: M2O; product_id: M2O; product_uom_qty: number; price_unit: number; display_type: string | false; is_downpayment?: boolean }`
  - `linkedCustomers(ctx: Ctx): Promise<Map<number, string>>` (Odoo partner id → account id)
  - `confirmedOrders(client: OdooClient, partnerIds: number[]): Promise<OdooOrderIn[]>`
  - `commercialOf(client: OdooClient, partnerIds: number[]): Promise<Map<number, number>>`
  - `readLines(client: OdooClient, orderIds: number[]): Promise<OdooLineIn[]>`
  - `crmLines(ctx: Ctx, lines: OdooLineIn[]): Promise<{ lines: OrderLineInput[]; missing: number }>`
  - `noteFor(ctx: Ctx, html: string | false | undefined, missing: number): string | null`
  - `importOrders(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date; orders: OdooOrderIn[]; commercial: Map<number, number>; linked: Map<number, string> }): Promise<number>`
  - from `orders-status.ts`: `MOVE_FIELDS: string[]`, `invoiceRows(moves: OdooMove[]): OrderLink["invoices"]`

- [ ] **Step 1: Extend the fake Odoo.** In `orders-helpers.ts`, `salesHandlers`, replace the `"sale.order/search_read": search(s.orders),` entry with a version that resolves `partner_id.commercial_partner_id`, and replace `"res.partner/read"` so it returns `commercial_partner_id`:

```ts
    "res.partner/read": (b: any) => pick(s.partners.filter((p) => b.ids.includes(p.id)).map((p) => ({ ...p, commercial_partner_id: p.commercial_partner_id ?? (p.parent_id ? p.parent_id : [p.id, String(p.name ?? p.id)]) })), b.fields),
```

```ts
    "sale.order/search_read": (b: any) => {
      const commercial = (o: RecordData) => {
        const pid = Array.isArray(o.partner_id) ? (o.partner_id as [number, string])[0] : (o.partner_id as number);
        const p = s.partners.find((x) => x.id === pid);
        return p?.parent_id ? (p.parent_id as [number, string])[0] : pid;
      };
      const hit = s.orders.filter((o) => evalDomain(o, b.domain ?? [], (f, r) => (f === "partner_id.commercial_partner_id" ? commercial(r) : r[f])));
      return pick(hit.slice(0, b.limit ?? hit.length), b.fields);
    },
```

(`pick` keeps `id` plus the asked fields; `sale.order/fields_get` already lists the fields from `saleFields` or the default — add `"partner_id", "origin", "date_order", "currency_id", "note", "write_date", "amount_untaxed"` to that default array.)

- [ ] **Step 2: Write the failing tests** — append to `orders-in.test.ts`:

```ts
import { importOrders, linkedCustomers, confirmedOrders, commercialOf, type OdooOrderIn } from "../orders-in";
import { type OrderLink } from "../store";

const odooOrder = (over: Record<string, unknown> = {}) => ({
  id: 900, name: "S00900", state: "sale", partner_id: [50, "Bubble s.r.o."], origin: false, date_order: "2026-03-05 10:22:11",
  currency_id: [9, "CZK"], note: "<p>Leave at the gate</p>", write_date: "2026-03-05 10:30:00", amount_total: 242, amount_untaxed: 200,
  delivery_status: false, invoice_status: "no", invoice_ids: [], picking_ids: [], ...over,
});
const line = (over: Record<string, unknown> = {}) => ({ id: 1, order_id: [900, "S00900"], product_id: [700, "Scoop"], product_uom_qty: 2, price_unit: 100, display_type: false, is_downpayment: false, ...over });
const customer = { id: 50, name: "Bubble s.r.o.", parent_id: false, active: true, type: "contact" };

async function run(m: ReturnType<typeof mkOrders>, dry = false) {
  const linked = await linkedCustomers(m.ctx);
  const orders = await confirmedOrders(m.client, [...linked.keys()]);
  const commercial = await commercialOf(m.client, orders.map((o) => o.partner_id[0]));
  return importOrders({ ctx: m.ctx, client: m.client, dry, now, orders, commercial, linked });
}
const setup = (sales: Record<string, unknown> = {}, opts: Record<string, unknown> = {}) => {
  const m = mkOrders({ orders: [], sales: { partners: [customer], orders: [odooOrder()] as never[], lines: [line()] as never[], ...sales }, ...opts });
  void m.ctx.store.set(K.partner(50), { accountId: "a1" });
  return m;
};

describe("importing Odoo orders", () => {
  it("imports a confirmed order of a linked customer as an EXTERNAL order", async () => {
    const m = setup();
    expect(await run(m)).toBe(1);
    expect(m.data.orders).toHaveLength(1);
    expect(m.data.orders[0]).toMatchObject({ accountId: "a1", externalRef: "900", status: "CONFIRMED", currency: "CZK", orderDate: "2026-03-05", note: "Leave at the gate", lines: [{ productId: "p1", quantity: 2, unitPrice: 100 }] });
    const orderId = m.data.orders[0].id as string;
    expect(await m.ctx.store.get(K.odooOrder(900))).toEqual({ orderId });
    expect(await m.ctx.store.get<OrderLink>(K.order(orderId))).toMatchObject({ odooId: 900, name: "S00900", state: "sale", imported: true, partnerId: 50, writeDate: "2026-03-05 10:30:00", total: 242 });
  });

  it("skips quotations, cancelled orders and customers that are not linked", async () => {
    const m = setup({ partners: [customer, { id: 60, name: "Other", parent_id: false, active: true }], orders: [odooOrder({ id: 901, state: "draft" }), odooOrder({ id: 902, state: "cancel" }), odooOrder({ id: 903, partner_id: [60, "Other"] })] });
    expect(await run(m)).toBe(0);
    expect(m.data.orders).toHaveLength(0);
  });

  it("imports an order placed on a delivery contact into the customer's account", async () => {
    const m = setup({ partners: [customer, { id: 51, name: "Depot", parent_id: [50, "Bubble s.r.o."], active: true, type: "delivery" }], orders: [odooOrder({ partner_id: [51, "Depot"] })] });
    expect(await run(m)).toBe(1);
    expect(m.data.orders[0].accountId).toBe("a1");
  });

  it("keeps product lines only; notes, sections, down payments skipped, unknown products counted in the note", async () => {
    const m = setup({ lines: [line(), line({ id: 2, display_type: "line_note", product_id: false }), line({ id: 3, display_type: "line_section", product_id: false }), line({ id: 4, is_downpayment: true, product_id: [701, "Down payment"] }), line({ id: 5, product_id: [799, "Unknown"] })] });
    await run(m);
    expect(m.data.orders[0].lines).toEqual([{ productId: "p1", quantity: 2, unitPrice: 100 }]);
    expect(m.data.orders[0].note).toBe("Leave at the gate\norders.linesMissing");
  });

  it("turns Odoo's HTML note into plain text, and no note into null", async () => {
    const m = setup({ orders: [odooOrder({ note: "<p>A &amp; B<br>C</p>" }), odooOrder({ id: 901, note: false })], lines: [line(), line({ id: 2, order_id: [901, "S00901"] })] });
    await run(m);
    expect(m.data.orders.map((o) => o.note)).toEqual(["A & B\nC", null]);
  });

  it("imports an order with no line left, with the note", async () => {
    const m = setup({ lines: [line({ product_id: [799, "Unknown"] })] });
    expect(await run(m)).toBe(1);
    expect(m.data.orders[0]).toMatchObject({ lines: [], note: "Leave at the gate\norders.linesMissing" });
  });

  it("takes the status from Odoo's invoices", async () => {
    const m = setup({ orders: [odooOrder({ invoice_status: "invoiced", invoice_ids: [7] })], moves: [{ id: 7, name: "INV/7", move_type: "out_invoice", state: "posted", payment_state: "paid", invoice_date: "2026-03-06", invoice_date_due: "2026-03-20", amount_total: 242, amount_residual: 0 }] as never[] });
    await run(m);
    expect(m.data.orders[0].status).toBe("PAID");
    const link = await m.ctx.store.get<OrderLink>(K.order(m.data.orders[0].id as string));
    expect(link).toMatchObject({ done: true, invoices: [{ number: "INV/7", paymentState: "paid" }] });
  });

  it("never imports twice", async () => {
    const m = setup();
    await run(m);
    expect(await run(m)).toBe(0);
    expect(m.data.orders).toHaveLength(1);
  });

  it("never imports an order the CRM sent, even when its link was lost", async () => {
    const m = setup({ orders: [odooOrder({ origin: "ORD-2026-0001" })] }, { orders: [{ id: "o1", number: "ORD-2026-0001", source: "CRM", status: "SENT", accountId: "a1" }] });
    expect(await run(m)).toBe(0);
    expect(m.data.orders).toHaveLength(1);
    expect(await m.ctx.store.get(K.odooOrder(900))).toEqual({ orderId: "o1" });
  });

  it("indexes 3a links from before 0.4.0 and skips them", async () => {
    const m = setup();
    await m.ctx.store.set(K.order("o9"), { odooId: 900, name: "S00900" });
    expect(await run(m)).toBe(0);
    expect(await m.ctx.store.get(K.odooOrder(900))).toEqual({ orderId: "o9" });
  });

  it("imports at most 200 per run and the rest next run", async () => {
    const many = Array.from({ length: 205 }, (_, i) => odooOrder({ id: 1000 + i, name: `S${1000 + i}` }));
    const m = setup({ orders: many, lines: [] });
    expect(await run(m)).toBe(200);
    expect(await run(m)).toBe(5);
    expect(new Set(m.data.orders.map((o) => o.externalRef)).size).toBe(205);
  });

  it("a failing order is recorded, the others continue, and it is retried next run", async () => {
    const m = setup({ orders: [odooOrder(), odooOrder({ id: 901, name: "S00901" })], lines: [] });
    const create = m.ctx.data.orders.create.bind(m.ctx.data.orders);
    let fail = true;
    m.ctx.data.orders.create = async (d: any) => { if (fail && d.externalRef === "900") throw new Error("Currency not found: XYZ"); return create(d); };
    expect(await run(m)).toBe(1);
    expect(await m.ctx.store.get(K.importFailed(900))).toEqual({ name: "S00900", reason: "Currency not found: XYZ", at: now.toISOString() });
    fail = false;
    expect(await run(m)).toBe(1);
    expect(await m.ctx.store.get(K.importFailed(900))).toBeNull();
  });

  it("dry run skips orders the CRM sent, writes nothing", async () => {
    const m = setup({ orders: [odooOrder(), odooOrder({ id: 901, name: "S00901" })], lines: [] });
    await m.ctx.store.set(K.order("o9"), { odooId: 901, name: "S00901" });
    expect(await run(m, true)).toBe(0);
    expect(m.data.orders).toHaveLength(0);
    expect(await m.ctx.store.get(K.odooOrder(901))).toBeNull();
    expect(m.ctx.logs.filter((l) => l.message.startsWith("Dry run: would import"))).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run them** — `pnpm exec jest plugins/odoo-connector/__tests__/orders-in.test.ts`. Expected: FAIL, `Cannot find module '../orders-in'`.

- [ ] **Step 4: Implement.** In `orders-status.ts`, change `const MOVE_FIELDS = [` to `export const MOVE_FIELDS = [`, and add below `targetStatus`:

```ts
/** Posted invoices as the order panel shows them. */
export function invoiceRows(moves: OdooMove[]): OrderLink["invoices"] {
  return moves.filter((m) => m.state === "posted").map((m) => ({ number: m.name, type: m.move_type, date: m.invoice_date || null, due: m.invoice_date_due || null, amount: m.amount_total, residual: m.amount_residual, paymentState: m.payment_state }));
}
```

and in `syncOrderStatuses` replace the `invoices: mine.filter((m) => m.state === "posted").map(…)` expression with `invoices: invoiceRows(mine),`.

Create `orders-in.ts`:

```ts
import type { OrderLineInput } from "@nextcrm/plugin-sdk";
import { availableFields } from "./catalog";
import type { M2O } from "./map";
import { OdooAuthError, type OdooClient } from "./odoo";
import { MOVE_FIELDS, invoiceRows, targetStatus, type OdooMove, type OdooSale } from "./orders-status";
import type { Ctx } from "./settings";
import { K, type OrderLink, type ProductLink } from "./store";

export interface OdooOrderIn extends OdooSale { partner_id: M2O; origin: string | false; date_order: string; currency_id: M2O; note: string | false; write_date: string; amount_untaxed: number }
export interface OdooLineIn { id: number; order_id: M2O; product_id: M2O; product_uom_qty: number; price_unit: number; display_type: string | false; is_downpayment?: boolean }

const PER_RUN = 200;
const TOLERANCE = 1;
const FINAL = new Set(["PAID", "CANCELLED"]);
const IN_FIELDS = ["id", "name", "state", "partner_id", "origin", "date_order", "currency_id", "note", "write_date", "amount_total", "amount_untaxed", "delivery_status", "invoice_status", "invoice_ids", "picking_ids"];
const LINE_FIELDS = ["order_id", "product_id", "product_uom_qty", "price_unit", "display_type", "is_downpayment"];

/** Customers linked to a CRM account: Odoo partner id → account id. */
export async function linkedCustomers(ctx: Ctx): Promise<Map<number, string>> {
  return new Map((await ctx.store.list("partner:")).map((e) => [Number(e.key.slice(8)), (e.value as { accountId: string }).accountId]));
}

/** Spec § 4.2: every confirmed order whose customer (commercial partner) is linked. */
export async function confirmedOrders(client: OdooClient, partnerIds: number[]): Promise<OdooOrderIn[]> {
  if (!partnerIds.length) return [];
  const fields = await availableFields(client, "sale.order", IN_FIELDS);
  const rows = await client.call<OdooOrderIn[]>("sale.order", "search_read", {
    domain: [["state", "in", ["sale", "done"]], ["partner_id.commercial_partner_id", "in", partnerIds]], fields, order: "id asc",
  });
  return rows.map((s) => ({ ...s, invoice_ids: s.invoice_ids ?? [], picking_ids: s.picking_ids ?? [] }));
}

/** Orders ship to child delivery contacts; the customer is their commercial partner. */
export async function commercialOf(client: OdooClient, partnerIds: number[]): Promise<Map<number, number>> {
  const ids = Array.from(new Set(partnerIds));
  if (!ids.length) return new Map();
  const rows = await client.call<{ id: number; commercial_partner_id: M2O }[]>("res.partner", "read", { ids, fields: ["commercial_partner_id"] });
  return new Map(rows.map((r) => [r.id, r.commercial_partner_id ? r.commercial_partner_id[0] : r.id]));
}

export async function readLines(client: OdooClient, orderIds: number[]): Promise<OdooLineIn[]> {
  if (!orderIds.length) return [];
  const fields = await availableFields(client, "sale.order.line", LINE_FIELDS);
  return client.call<OdooLineIn[]>("sale.order.line", "search_read", { domain: [["order_id", "in", orderIds]], fields, order: "id asc" });
}

/** Spec § 4.3 step 2: product lines of CRM products only; notes, sections and down payments never. */
export async function crmLines(ctx: Ctx, lines: OdooLineIn[]): Promise<{ lines: OrderLineInput[]; missing: number }> {
  const out: OrderLineInput[] = [];
  let missing = 0;
  for (const l of lines) {
    if (l.display_type || l.is_downpayment || !l.product_id) continue;
    const link = await ctx.store.get<ProductLink>(K.product(l.product_id[0]));
    if (!link) { missing++; continue; }
    out.push({ productId: link.productId, quantity: l.product_uom_qty, unitPrice: l.price_unit });
  }
  return { lines: out, missing };
}

const plain = (html: string | false | undefined) => (html ? String(html) : "")
  .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/\n{2,}/g, "\n").trim();

/** Odoo's note as plain text, plus how many lines were left out. */
export function noteFor(ctx: Ctx, html: string | false | undefined, missing: number): string | null {
  return [plain(html), missing ? ctx.t("orders.linesMissing", { count: missing }) : ""].filter(Boolean).join("\n") || null;
}

/** Spec § 3.1: orders linked before 0.4.0 get their index entry. */
async function indexLinks(ctx: Ctx) {
  for (const e of await ctx.store.list("order:")) {
    const l = e.value as OrderLink;
    if (l.odooId && !(await ctx.store.get(K.odooOrder(l.odooId)))) await ctx.store.set(K.odooOrder(l.odooId), { orderId: e.key.slice(6) });
  }
}

/** Spec §§ 4.2–4.3: imports confirmed Odoo orders the CRM does not have yet, at most 200 per run. Returns how many were imported. */
export async function importOrders(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date; orders: OdooOrderIn[]; commercial: Map<number, number>; linked: Map<number, string> }): Promise<number> {
  const { ctx, client, dry, now } = a;
  if (!dry) await indexLinks(ctx);
  const known = new Set<number>([
    ...(await ctx.store.list("odooOrder:")).map((e) => Number(e.key.slice(10))),
    ...(await ctx.store.list("order:")).map((e) => (e.value as OrderLink).odooId),
  ]);
  const batch = a.orders.filter((s) => !known.has(s.id)).slice(0, PER_RUN);
  if (!batch.length) return 0;
  const lines = await readLines(client, batch.map((s) => s.id));
  const moveIds = batch.flatMap((s) => s.invoice_ids ?? []);
  const moves = moveIds.length ? await client.call<OdooMove[]>("account.move", "search_read", { domain: [["id", "in", moveIds]], fields: MOVE_FIELDS }) : [];
  let imported = 0;
  for (const s of batch) {
    try {
      if (s.origin) {
        const [mine] = await ctx.data.orders.find({ where: { number: s.origin, source: "CRM" }, take: 1 });
        if (mine) { if (!dry) await ctx.store.set(K.odooOrder(s.id), { orderId: mine.id as string }); continue; }
      }
      const partnerId = a.commercial.get(s.partner_id[0]) ?? s.partner_id[0];
      const accountId = a.linked.get(partnerId);
      if (!accountId) continue;
      const { lines: crm, missing } = await crmLines(ctx, lines.filter((l) => l.order_id && l.order_id[0] === s.id));
      const mine = moves.filter((m) => s.invoice_ids!.includes(m.id));
      const status = targetStatus(s, mine);
      if (dry) {
        ctx.log.info(`Dry run: would import Odoo order ${s.name}`, { accountId, lines: crm.length, status });
        continue;
      }
      const row = await ctx.data.orders.create({
        accountId, externalRef: String(s.id), status: status as never, currency: s.currency_id ? s.currency_id[1] : undefined,
        orderDate: s.date_order.slice(0, 10), note: noteFor(ctx, s.note, missing), lines: crm,
      });
      const orderId = row.id as string;
      const link: OrderLink = {
        odooId: s.id, name: s.name, state: s.state, sentAt: now.toISOString(), total: s.amount_total,
        totalDiffers: row.grandTotal !== undefined && Math.abs(s.amount_total - Number(row.grandTotal)) > TOLERANCE,
        priceDiffs: [], deliveries: [], invoices: invoiceRows(mine), created: [], checkedAt: now.toISOString(),
        imported: true, partnerId, writeDate: s.write_date, ...(FINAL.has(status) ? { done: true } : {}),
      };
      await ctx.store.set(K.order(orderId), link);
      await ctx.store.set(K.odooOrder(s.id), { orderId });
      await ctx.store.delete(K.importFailed(s.id));
      imported++;
    } catch (e) {
      if (e instanceof OdooAuthError) throw e;
      const reason = e instanceof Error ? e.message : String(e);
      ctx.log.warn(`Odoo order ${s.name} not imported: ${reason}`, { odooId: s.id });
      if (!dry) await ctx.store.set(K.importFailed(s.id), { name: s.name, reason, at: now.toISOString() });
    }
  }
  return imported;
}
```

Add `"linesMissing"` to the `orders` section of every messages file:
- en: `"linesMissing": "{count} lines not shown: products not in the CRM"`
- cz: `"linesMissing": "Nezobrazené řádky: {count} (produkty nejsou v CRM)"`
- de: `"linesMissing": "{count} Positionen nicht angezeigt: Produkte nicht im CRM"`
- uk: `"linesMissing": "Не показано рядків: {count} (товарів немає в CRM)"`

- [ ] **Step 5: Run** `pnpm exec jest plugins/odoo-connector`. Expected: PASS (the status tests still pass with `invoiceRows`).

- [ ] **Step 6: Commit**

```bash
test "$(git branch --show-current)" = feat/odoo-connector-orders-in && git add plugins/odoo-connector/orders-in.ts plugins/odoo-connector/orders-status.ts plugins/odoo-connector/__tests__/orders-helpers.ts plugins/odoo-connector/__tests__/orders-in.test.ts plugins/odoo-connector/messages && git commit -m "feat(odoo-connector): import confirmed Odoo orders of linked customers

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Keeping imported orders current

**Files:**
- Modify: `plugins/odoo-connector/orders-status.ts`
- Modify: `plugins/odoo-connector/messages/{en,cz,de,uk}.json` (`mail.movedSubject`, `mail.movedText`)
- Test: `plugins/odoo-connector/__tests__/orders-in.test.ts`

**Interfaces:**
- Consumes: `commercialOf`, `readLines`, `crmLines`, `noteFor` from `orders-in.ts` (Task 2); `tell` from `settings.ts`.
- Produces: `syncOrderStatuses` unchanged signature; `OdooSale` gains optional `partner_id?: M2O; write_date?: string; note?: string | false`.

- [ ] **Step 1: Write the failing tests** — append to `orders-in.test.ts`:

```ts
import { syncOrderStatuses } from "../orders-status";

describe("keeping imported orders current", () => {
  const imported = async (sales: Record<string, unknown> = {}) => {
    const m = setup(sales);
    await run(m);
    return m;
  };

  it("replaces the lines when the Odoo order changed, not otherwise", async () => {
    const m = await imported();
    const update = jest.spyOn(m.ctx.data.orders, "update");
    await syncOrderStatuses({ ctx: m.ctx, client: m.client, dry: false, now });
    expect(update).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ lines: expect.anything() }));
    Object.assign(m.sales.orders[0], { write_date: "2026-03-06 09:00:00" });
    m.sales.lines[0].product_uom_qty = 5;
    await syncOrderStatuses({ ctx: m.ctx, client: m.client, dry: false, now });
    expect(m.data.orders[0].lines).toEqual([{ productId: "p1", quantity: 5, unitPrice: 100 }]);
    expect((await m.ctx.store.get<OrderLink>(K.order(m.data.orders[0].id as string)))!.writeDate).toBe("2026-03-06 09:00:00");
  });

  it("a changed customer in Odoo keeps the account, flags the panel and emails admins once", async () => {
    const m = await imported({ partners: [customer, { id: 60, name: "Other", parent_id: false, active: true }] });
    Object.assign(m.sales.orders[0], { partner_id: [60, "Other"] });
    await syncOrderStatuses({ ctx: m.ctx, client: m.client, dry: false, now });
    await syncOrderStatuses({ ctx: m.ctx, client: m.client, dry: false, now });
    expect(m.data.orders[0].accountId).toBe("a1");
    expect((await m.ctx.store.get<OrderLink>(K.order(m.data.orders[0].id as string)))!.movedNotified).toBe(true);
    expect(m.ctx.notifications.map((n) => n.subject)).toEqual(["mail.movedSubject"]);
  });

  it("an imported order that disappears from Odoo is not cancelled", async () => {
    const m = await imported();
    m.sales.orders.length = 0;
    await syncOrderStatuses({ ctx: m.ctx, client: m.client, dry: false, now });
    expect(m.data.orders[0].status).toBe("CONFIRMED");
  });
});
```

- [ ] **Step 2: Run** `pnpm exec jest plugins/odoo-connector/__tests__/orders-in.test.ts`. Expected: the first two new tests FAIL (lines unchanged, no notification); the third passes already (PR #372 behaviour).

- [ ] **Step 3: Implement** in `orders-status.ts`:

1. `OdooSale` interface: add `partner_id?: M2O | false; write_date?: string; note?: string | false;` and `import type { M2O } from "./map";`.
2. `SALE_FIELDS`: append `"partner_id", "write_date", "note"`.
3. Imports: `import { commercialOf, crmLines, noteFor, readLines } from "./orders-in";` (circular import is fine: only functions are used at call time).
4. After `const picks = …;` add:

```ts
  // Spec § 4.4: imported orders follow Odoo's lines and notice a changed customer.
  const imp = open.filter((o) => o.link.imported && byId.has(o.link.odooId));
  const commercial = await commercialOf(client, imp.map((o) => byId.get(o.link.odooId)!.partner_id).filter((p): p is [number, string] => !!p).map((p) => p[0]));
  const changed = imp.filter((o) => byId.get(o.link.odooId)!.write_date !== o.link.writeDate).map((o) => o.link.odooId);
  const freshLines = dry ? [] : await readLines(client, changed);
```

5. In the loop, after the `link` object is built and before `if (dry) {`, add:

```ts
    if (o.link.imported && !dry) {
      if (sale.write_date && sale.write_date !== o.link.writeDate) {
        const { lines, missing } = await crmLines(ctx, freshLines.filter((l) => l.order_id && l.order_id[0] === sale.id));
        try { await ctx.data.orders.update(o.orderId, { lines, note: noteFor(ctx, sale.note, missing) }); link.writeDate = sale.write_date; }
        catch (e) { ctx.log.warn(`Order ${number}: lines not updated: ${e instanceof Error ? e.message : String(e)}`, { orderId: o.orderId }); }
      }
      const owner = sale.partner_id ? (commercial.get(sale.partner_id[0]) ?? sale.partner_id[0]) : null;
      if (owner !== null && owner !== o.link.partnerId && !o.link.movedNotified) {
        ctx.log.warn(`Odoo order ${o.link.name} now belongs to another customer; the CRM order keeps its account`, { orderId: o.orderId });
        await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.movedSubject", { number }), text: ctx.t("mail.movedText", { number, name: o.link.name }) });
        link.movedNotified = true;
      }
    }
```

Messages, `mail` section of every file:
- en: `"movedSubject": "Order {number}: customer changed in Odoo"`, `"movedText": "Odoo order {name} (CRM order {number}) now belongs to another customer in Odoo. The CRM order keeps its account; move or cancel it by hand if needed."`
- cz: `"movedSubject": "Objednávka {number}: v Odoo se změnil zákazník"`, `"movedText": "Objednávka Odoo {name} (objednávka CRM {number}) teď v Odoo patří jinému zákazníkovi. Objednávka v CRM zůstává u svého účtu; v případě potřeby ji přesuňte nebo zrušte ručně."`
- de: `"movedSubject": "Auftrag {number}: Kunde in Odoo geändert"`, `"movedText": "Der Odoo-Auftrag {name} (CRM-Auftrag {number}) gehört in Odoo jetzt einem anderen Kunden. Der CRM-Auftrag bleibt bei seinem Account; verschieben oder stornieren Sie ihn bei Bedarf von Hand."`
- uk: `"movedSubject": "Замовлення {number}: в Odoo змінився клієнт"`, `"movedText": "Замовлення Odoo {name} (замовлення CRM {number}) тепер в Odoo належить іншому клієнту. Замовлення в CRM залишається у своєму акаунті; за потреби перемістіть або скасуйте його вручну."`

- [ ] **Step 4: Run** `pnpm exec jest plugins/odoo-connector`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
test "$(git branch --show-current)" = feat/odoo-connector-orders-in && git add plugins/odoo-connector/orders-status.ts plugins/odoo-connector/__tests__/orders-in.test.ts plugins/odoo-connector/messages && git commit -m "feat(odoo-connector): keep imported orders' lines current, notice a changed customer

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Customer info (open invoices, yearly totals)

**Files:**
- Create: `plugins/odoo-connector/customer-info.ts`
- Test: `plugins/odoo-connector/__tests__/customer-info.test.ts`

**Interfaces:**
- Consumes: `OdooOrderIn` (Task 2), `K.customer`, `CustomerInfo`, `OpenInvoice` (Task 1).
- Produces: `syncCustomerInfo(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date; linked: Map<number, string>; orders: OdooOrderIn[]; commercial: Map<number, number> }): Promise<void>`.

- [ ] **Step 1: Write the failing tests** — `customer-info.test.ts`:

```ts
import { syncCustomerInfo } from "../customer-info";
import { K, type CustomerInfo } from "../store";
import type { OdooOrderIn } from "../orders-in";
import { mkOrders } from "./orders-helpers";
import { now } from "./helpers";

const inv = (over: Record<string, unknown> = {}) => ({ id: 1, name: "INV/1", move_type: "out_invoice", state: "posted", payment_state: "not_paid", commercial_partner_id: [50, "Bubble"], invoice_date: "2026-09-01", invoice_date_due: "2026-09-15", currency_id: [9, "CZK"], amount_total: 1210, amount_residual: 1210, ...over });
const ord = (over: Record<string, unknown> = {}) => ({ id: 1, partner_id: [50, "Bubble"], date_order: "2026-03-05 10:00:00", currency_id: [9, "CZK"], amount_untaxed: 100, ...over }) as unknown as OdooOrderIn;

function setup(moves: Record<string, unknown>[]) {
  const m = mkOrders({ sales: { moves: moves as never[] } });
  return m;
}

it("stores open invoices and credit notes and this and last year's totals per linked account", async () => {
  const m = setup([inv(), inv({ id: 2, name: "RINV/2", move_type: "out_refund", amount_total: 100, amount_residual: 100 }), inv({ id: 3, payment_state: "paid" }), inv({ id: 4, commercial_partner_id: [60, "Other"] })]);
  const linked = new Map([[50, "a1"], [70, "a2"]]);
  const orders = [ord(), ord({ id: 2, amount_untaxed: 50.5 }), ord({ id: 3, date_order: "2025-12-31 23:00:00" }), ord({ id: 4, date_order: "2024-06-01 00:00:00" }), ord({ id: 5, partner_id: [51, "Depot"], currency_id: [125, "EUR"], amount_untaxed: 10 })];
  await syncCustomerInfo({ ctx: m.ctx, client: m.client, dry: false, now, linked, orders, commercial: new Map([[51, 50]]) });
  expect(await m.ctx.store.get<CustomerInfo>(K.customer("a1"))).toEqual({
    at: now.toISOString(),
    invoices: [
      { number: "INV/1", type: "out_invoice", date: "2026-09-01", due: "2026-09-15", currency: "CZK", amount: 1210, residual: 1210 },
      { number: "RINV/2", type: "out_refund", date: "2026-09-01", due: "2026-09-15", currency: "CZK", amount: 100, residual: 100 },
    ],
    totals: [{ year: 2026, currency: "CZK", amount: 150.5 }, { year: 2026, currency: "EUR", amount: 10 }, { year: 2025, currency: "CZK", amount: 100 }],
  });
  expect(await m.ctx.store.get(K.customer("a2"))).toEqual({ at: now.toISOString(), invoices: [], totals: [] });
});

it("writes nothing in dry run", async () => {
  const m = setup([inv()]);
  await syncCustomerInfo({ ctx: m.ctx, client: m.client, dry: true, now, linked: new Map([[50, "a1"]]), orders: [], commercial: new Map() });
  expect(await m.ctx.store.get(K.customer("a1"))).toBeNull();
});
```

The fake `account.move/search_read` already filters by domain with `evalDomain` (fields `move_type`, `state`, `payment_state`, `commercial_partner_id` are on the rows).

- [ ] **Step 2: Run** `pnpm exec jest plugins/odoo-connector/__tests__/customer-info.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `customer-info.ts`:

```ts
import type { M2O } from "./map";
import type { OdooClient } from "./odoo";
import type { OdooOrderIn } from "./orders-in";
import type { Ctx } from "./settings";
import { K, type CustomerInfo, type OpenInvoice } from "./store";

interface OdooInvoice { name: string; move_type: "out_invoice" | "out_refund"; commercial_partner_id: M2O; invoice_date: string | false; invoice_date_due: string | false; currency_id: M2O; amount_total: number; amount_residual: number }
const INV_FIELDS = ["name", "move_type", "commercial_partner_id", "invoice_date", "invoice_date_due", "currency_id", "amount_total", "amount_residual"];
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Spec § 4.5 (+ plan Ruling R1): open invoices in one call; totals summed from the confirmed orders the import already read. */
export async function syncCustomerInfo(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date; linked: Map<number, string>; orders: OdooOrderIn[]; commercial: Map<number, number> }): Promise<void> {
  const { ctx, client, dry, now, linked } = a;
  if (dry || !linked.size) return;
  const rows = await client.call<OdooInvoice[]>("account.move", "search_read", {
    domain: [["move_type", "in", ["out_invoice", "out_refund"]], ["state", "=", "posted"], ["payment_state", "in", ["not_paid", "partial"]], ["commercial_partner_id", "in", [...linked.keys()]]],
    fields: INV_FIELDS, order: "invoice_date_due asc, id asc",
  });
  const invoices = new Map<number, OpenInvoice[]>();
  for (const r of rows) {
    const p = r.commercial_partner_id ? r.commercial_partner_id[0] : 0;
    invoices.set(p, [...(invoices.get(p) ?? []), {
      number: r.name, type: r.move_type, date: r.invoice_date || null, due: r.invoice_date_due || null,
      currency: r.currency_id ? r.currency_id[1] : "", amount: r.amount_total, residual: r.amount_residual,
    }]);
  }
  const from = now.getUTCFullYear() - 1;
  const totals = new Map<number, Map<string, number>>();
  for (const o of a.orders) {
    const year = Number(o.date_order.slice(0, 4));
    if (year < from) continue;
    const p = a.commercial.get(o.partner_id[0]) ?? o.partner_id[0];
    const key = `${year}|${o.currency_id ? o.currency_id[1] : ""}`;
    const m = totals.get(p) ?? new Map<string, number>();
    m.set(key, (m.get(key) ?? 0) + o.amount_untaxed);
    totals.set(p, m);
  }
  for (const [partnerId, accountId] of linked) {
    const t = [...(totals.get(partnerId) ?? new Map<string, number>())].map(([k, amount]) => {
      const [year, currency] = k.split("|");
      return { year: Number(year), currency, amount: round2(amount) };
    }).sort((x, y) => y.year - x.year || x.currency.localeCompare(y.currency));
    await ctx.store.set(K.customer(accountId), { at: now.toISOString(), invoices: invoices.get(partnerId) ?? [], totals: t } satisfies CustomerInfo);
  }
}
```

- [ ] **Step 4: Run** `pnpm exec jest plugins/odoo-connector/__tests__/customer-info.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
test "$(git branch --show-current)" = feat/odoo-connector-orders-in && git add plugins/odoo-connector/customer-info.ts plugins/odoo-connector/__tests__/customer-info.test.ts && git commit -m "feat(odoo-connector): open invoices and yearly totals per linked account

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Wiring into the sync, admin page

**Files:**
- Modify: `plugins/odoo-connector/orders-in.ts` (add `syncOrdersIn`)
- Modify: `plugins/odoo-connector/sync.ts` (`runSync`, `summaryText`)
- Modify: `plugins/odoo-connector/ui/data.ts` (`ordersData`), `ui/AdminSection.tsx`
- Modify: `plugins/odoo-connector/messages/{en,cz,de,uk}.json`
- Modify: `plugins/odoo-connector/__tests__/ui.test.ts` (the exact `ordersData` expectation), `__tests__/review-fixes-minors.test.ts` (summary text)
- Test: `plugins/odoo-connector/__tests__/orders-in.test.ts`

**Interfaces:**
- Consumes: Tasks 2 and 4.
- Produces: `syncOrdersIn(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<number>`; `ordersData` result gains `imported: { total: number; lastRun: number; failed: ({ odooId: number } & ImportFailed)[] }`.

- [ ] **Step 1: Write the failing tests** — append to `orders-in.test.ts`:

```ts
import { runSync, summaryText } from "../sync";
import { ordersData } from "../ui/data";

describe("in the sync", () => {
  it("imports during the sync, stores customer info and reports the count", async () => {
    const m = setup();
    const catalog = jest.spyOn(require("../catalog"), "syncCatalog").mockResolvedValue(undefined);
    const summary = await runSync(m.ctx, m.client, now);
    catalog.mockRestore();
    expect(summary.orders?.imported).toBe(1);
    expect(await m.ctx.store.get(K.imported)).toEqual({ lastRun: 1 });
    expect(await m.ctx.store.get(K.customer("a1"))).toMatchObject({ at: now.toISOString() });
    expect(summaryText(m.ctx, summary)).toContain("admin.orderImported");
  });

  it("a failing import is logged and never fails the sync", async () => {
    const m = setup({ fail: { "sale.order.line/search_read": 500 } });
    const catalog = jest.spyOn(require("../catalog"), "syncCatalog").mockResolvedValue(undefined);
    const summary = await runSync(m.ctx, m.client, now);
    catalog.mockRestore();
    expect(summary.ok).toBe(true);
    expect(m.ctx.logs.some((l) => l.level === "error" && l.message.startsWith("Orders from Odoo failed"))).toBe(true);
  });

  it("does not count imported orders as sent; lists imports and failures", async () => {
    const m = setup();
    await run(m);
    await m.ctx.store.set(K.importFailed(77), { name: "S00077", reason: "Currency not found: XYZ", at: "x" });
    await m.ctx.store.set(K.imported, { lastRun: 1 });
    const d = await ordersData(m.ctx, now);
    expect(d.sent).toBe(0);
    expect(d.imported).toEqual({ total: 1, lastRun: 1, failed: [{ odooId: 77, name: "S00077", reason: "Currency not found: XYZ", at: "x" }] });
  });
});
```

(`fail` with a number in `salesHandlers` answers only `res.partner/create` and `sale.order/create` today; add `guard("sale.order.line/search_read", () => search(s.lines)(b))` for `sale.order.line/search_read` in the fake so the injected 500 works.)

- [ ] **Step 2: Run** `pnpm exec jest plugins/odoo-connector/__tests__/orders-in.test.ts`. Expected: FAIL (`summary.orders?.imported` undefined, `d.imported` undefined).

- [ ] **Step 3: Implement.**

`orders-in.ts`, at the end:

```ts
import { syncCustomerInfo } from "./customer-info";   // put with the other imports

/** Spec § 4.1: after the status check, every sync: import new orders, then refresh the account tab's data. */
export async function syncOrdersIn(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<number> {
  const linked = await linkedCustomers(a.ctx);
  if (!linked.size) return 0;
  const orders = await confirmedOrders(a.client, [...linked.keys()]);
  const commercial = await commercialOf(a.client, orders.map((o) => o.partner_id[0]));
  const imported = await importOrders({ ...a, orders, commercial, linked });
  await syncCustomerInfo({ ...a, linked, orders, commercial });
  if (!a.dry) await a.ctx.store.set(K.imported, { lastRun: imported });
  return imported;
}
```

`sync.ts`: import `syncOrdersIn` from `./orders-in`; in `runSync` after the status-check `try { … } catch { … }` block add:

```ts
    try {
      const imported = await syncOrdersIn({ ctx, client, dry, now });
      r.orders = { ...(r.orders ?? { checked: 0, moved: 0 }), imported };
    } catch (e) {
      if (e instanceof OdooAuthError) throw e;
      ctx.log.error(`Orders from Odoo failed: ${e instanceof Error ? e.message : String(e)}`);
    }
```

`summaryText`: replace the last line with

```ts
  const parts = [counts];
  if (s.orders?.checked) parts.push(ctx.t("admin.orderCounts", { checked: s.orders.checked, moved: s.orders.moved }));
  if (s.orders?.imported) parts.push(ctx.t("admin.orderImported", { imported: s.orders.imported }));
  return parts.join(" · ");
```

`ui/data.ts` `ordersData`: change the `sent` line to skip imported links, and add `imported`:

```ts
  const links = await ctx.store.list("order:");
  const sent = links.filter((e) => !(e.value as OrderLink).imported && Date.parse((e.value as OrderLink).sentAt) >= since).length;
  const importFailed = (await ctx.store.list("importFailed:")).map((e) => ({ odooId: Number(e.key.slice(13)), ...(e.value as ImportFailed) }));
```

and in the returned object add `imported: { total: links.filter((e) => (e.value as OrderLink).imported).length, lastRun: (await ctx.store.get<{ lastRun: number }>(K.imported))?.lastRun ?? 0, failed: importFailed },` (import `ImportFailed` from `../store`).

`ui/AdminSection.tsx`, in the Orders block after the counts line:

```tsx
        <p>{ctx.t("admin.importedCounts", { total: o.imported.total, last: o.imported.lastRun })}</p>
        {o.imported.failed.length > 0 && (
          <div>
            <h4 className="font-medium">{ctx.t("admin.importFailed")}</h4>
            <ul className="text-xs">{o.imported.failed.map((f) => <li key={f.odooId}>{f.name} · {f.reason}</li>)}</ul>
          </div>
        )}
```

Messages, `admin` section:
- en: `"orderImported": "imported {imported}"`, `"importedCounts": "Imported from Odoo: {total} in total, {last} on the last run"`, `"importFailed": "Not imported from Odoo"`
- cz: `"orderImported": "importováno {imported}"`, `"importedCounts": "Importováno z Odoo: celkem {total}, při posledním běhu {last}"`, `"importFailed": "Neimportováno z Odoo"`
- de: `"orderImported": "importiert {imported}"`, `"importedCounts": "Aus Odoo importiert: insgesamt {total}, beim letzten Lauf {last}"`, `"importFailed": "Nicht aus Odoo importiert"`
- uk: `"orderImported": "імпортовано {imported}"`, `"importedCounts": "Імпортовано з Odoo: всього {total}, під час останнього запуску {last}"`, `"importFailed": "Не імпортовано з Odoo"`

Update `ui.test.ts`'s exact `ordersData` expectation with `imported: { total: 0, lastRun: 0, failed: [] }`; `review-fixes-minors.test.ts` "the last-run line includes order counts" stays as is (no `imported`).

- [ ] **Step 4: Run** `pnpm exec jest plugins/odoo-connector`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
test "$(git branch --show-current)" = feat/odoo-connector-orders-in && git add plugins/odoo-connector/orders-in.ts plugins/odoo-connector/sync.ts plugins/odoo-connector/ui/data.ts plugins/odoo-connector/ui/AdminSection.tsx plugins/odoo-connector/messages plugins/odoo-connector/__tests__ && git commit -m "feat(odoo-connector): import Odoo orders on every sync, show imports on the admin page

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Account tab, order panel, plugin, docs

**Files:**
- Create: `plugins/odoo-connector/ui/AccountTab.tsx`
- Modify: `plugins/odoo-connector/settings.ts` (`localDay`), `ui/data.ts` (`accountTabData`), `ui/OrderPanel.tsx`, `plugin.ts`, `__tests__/plugin.test.ts`
- Modify: `plugins/odoo-connector/messages/{en,cz,de,uk}.json` (`tab.*`, `order.imported`, `order.moved`)
- Modify: `apps/docs/content/docs/admins/plugins/odoo-connector.mdx`
- Test: `plugins/odoo-connector/__tests__/account-tab.test.ts`

**Interfaces:**
- Consumes: `K.customer`, `CustomerInfo`, `OrderLink` (Task 1); `localTime` (`settings.ts`).
- Produces: `localDay(ctx: Ctx, d: Date): string` (YYYY-MM-DD in the instance zone); `accountTabData(ctx: Ctx, accountId: string, now: Date)` returning `null` when the account is not linked, else `{ partnerId, url, at, orders: { orderId, number, odooName, date, total, currency, status, imported }[], invoices: (OpenInvoice & { overdueDays: number; sign: 1 | -1 })[], owed: { currency, amount }[], totals: CustomerInfo["totals"] }`.

- [ ] **Step 1: Write the failing tests** — `account-tab.test.ts`:

```ts
import { localDay } from "../settings";
import { accountTabData } from "../ui/data";
import { K } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

it("is null for an account that is not linked", async () => {
  expect(await accountTabData(mkOrders().ctx, "a1", now)).toBeNull();
});

it("localDay is the calendar day in the instance zone", () => {
  expect(localDay(mkOrders({ settings: { timeZone: "Europe/Prague" } }).ctx, new Date("2026-10-12T22:30:00Z"))).toBe("2026-10-13");
});

it("lists the account's Odoo orders newest first, open invoices with overdue days and what is owed, totals", async () => {
  const { ctx } = mkOrders({ orders: [
    order({ id: "o1", number: "N1", status: "PAID", orderDate: "2026-03-05", subtotal: "200.00", currency: "CZK" }),
    order({ id: "o2", number: "N2", status: "CONFIRMED", orderDate: "2026-09-01", subtotal: "50.00", currency: "CZK" }),
    order({ id: "o3", number: "N3", status: "DRAFT", orderDate: "2026-10-01", subtotal: "9.00", currency: "CZK" }),
  ] });
  await ctx.store.set(K.account("a1"), { partnerId: 50, syncedAt: "x", salesperson: null });
  await ctx.store.set(K.order("o1"), { odooId: 900, name: "S00900", imported: true });
  await ctx.store.set(K.order("o2"), { odooId: 901, name: "S00901" });
  await ctx.store.set(K.customer("a1"), { at: "2026-10-13T07:45:00.000Z", totals: [{ year: 2026, currency: "CZK", amount: 250 }], invoices: [
    { number: "INV/1", type: "out_invoice", date: "2026-09-01", due: "2026-10-03", currency: "CZK", amount: 1210, residual: 1210 },
    { number: "RINV/2", type: "out_refund", date: "2026-09-02", due: null, currency: "CZK", amount: 100, residual: 100 },
  ] });
  const d = await accountTabData(ctx, "a1", now);
  expect(d).toMatchObject({
    partnerId: 50, url: "https://odoo.example.com/odoo/contacts/50", at: "2026-10-13T07:45:00.000Z",
    orders: [
      { orderId: "o2", number: "N2", odooName: "S00901", date: "2026-09-01", total: 50, currency: "CZK", status: "CONFIRMED", imported: false },
      { orderId: "o1", number: "N1", odooName: "S00900", date: "2026-03-05", total: 200, currency: "CZK", status: "PAID", imported: true },
    ],
    invoices: [{ number: "INV/1", overdueDays: 10, sign: 1 }, { number: "RINV/2", overdueDays: 0, sign: -1 }],
    owed: [{ currency: "CZK", amount: 1110 }],
    totals: [{ year: 2026, currency: "CZK", amount: 250 }],
  });
});

it("shows at most 50 orders", async () => {
  const orders = Array.from({ length: 55 }, (_, i) => order({ id: `o${i}`, number: `N${i}`, orderDate: `2026-01-${String((i % 28) + 1).padStart(2, "0")}` }));
  const { ctx } = mkOrders({ orders });
  await ctx.store.set(K.account("a1"), { partnerId: 50, syncedAt: "x", salesperson: null });
  for (const o of orders) await ctx.store.set(K.order(o.id as string), { odooId: 1, name: "S" });
  expect((await accountTabData(ctx, "a1", now))!.orders).toHaveLength(50);
});
```

and in `plugin.test.ts` change the version to `"0.4.0"` and add `expect(plugin.extensions.accountTabs.map((t) => [t.id, t.title])).toEqual([["odoo", "tab.title"]]);`.

- [ ] **Step 2: Run** `pnpm exec jest plugins/odoo-connector/__tests__/account-tab.test.ts plugins/odoo-connector/__tests__/plugin.test.ts`. Expected: FAIL (`accountTabData` / `localDay` not exported; version 0.3.1; no tab).

- [ ] **Step 3: Implement.**

`settings.ts`, after `localTime`:

```ts
/** The calendar day (YYYY-MM-DD) of a moment in the instance's time zone. */
export function localDay(ctx: Ctx, d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ctx.settings.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
```

`ui/data.ts` (import `localDay` from `../settings`, `CustomerInfo`, `OpenInvoice` from `../store`):

```ts
const DAY = 86_400_000;
const day = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** Spec § 4.6: built from storage and CRM data only; no Odoo call. */
export async function accountTabData(ctx: Ctx, accountId: string, now: Date) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  const info = await ctx.store.get<CustomerInfo>(K.customer(accountId));
  const orders: { orderId: string; number: string; odooName: string; date: string; total: number; currency: string; status: string; imported: boolean }[] = [];
  for (const o of await ctx.data.orders.find({ where: { accountId }, orderBy: { orderDate: "desc" }, take: 500 })) {
    const l = await ctx.store.get<OrderLink>(K.order(o.id as string));
    if (!l) continue;
    orders.push({ orderId: o.id as string, number: String(o.number), odooName: l.name, date: day(o.orderDate), total: Number(o.subtotal), currency: String(o.currency), status: String(o.status), imported: !!l.imported });
    if (orders.length === 50) break;
  }
  const today = localDay(ctx, now);
  const invoices = (info?.invoices ?? []).map((i: OpenInvoice) => ({
    ...i, sign: (i.type === "out_refund" ? -1 : 1) as 1 | -1,
    overdueDays: i.due && i.due < today ? Math.round((Date.parse(today) - Date.parse(i.due)) / DAY) : 0,
  }));
  const owed = new Map<string, number>();
  for (const i of invoices) owed.set(i.currency, Math.round(((owed.get(i.currency) ?? 0) + i.sign * i.residual) * 100) / 100);
  const base = ctx.settings.url.replace(/\/+$/, "");
  return {
    partnerId: link.partnerId, url: `${base}/odoo/contacts/${link.partnerId}`, at: info?.at ?? null,
    orders, invoices, owed: [...owed].map(([currency, amount]) => ({ currency, amount })), totals: info?.totals ?? [],
  };
}
```

`ui/AccountTab.tsx`:

```tsx
import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { accountTabData } from "./data";

export async function AccountTab({ accountId, ctx }: AccountSlotProps<Settings, Secrets>) {
  const d = await accountTabData(ctx, accountId, new Date());
  if (!d) return <p className="text-sm text-muted-foreground">{ctx.t("tab.notLinked")}</p>;
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">{d.at ? ctx.t("tab.asOf", { date: localTime(ctx, d.at) }) : ctx.t("tab.notYet")}</p>
      <section>
        <h3 className="mb-1 font-medium">{ctx.t("tab.orders")}</h3>
        {d.orders.length === 0 ? <p className="text-muted-foreground">{ctx.t("tab.ordersEmpty")}</p> : (
          <table className="w-full text-xs">
            <thead><tr className="text-left"><th>{ctx.t("tab.number")}</th><th>{ctx.t("tab.odoo")}</th><th>{ctx.t("tab.date")}</th><th className="text-right">{ctx.t("tab.total")}</th><th>{ctx.t("tab.status")}</th></tr></thead>
            <tbody>{d.orders.map((o) => (
              <tr key={o.orderId}><td><a className="underline" href={`/crm/orders/${o.orderId}`}>{o.number}</a></td><td>{o.odooName}</td><td>{o.date}</td><td className="text-right">{o.total.toFixed(2)} {o.currency}</td><td>{o.status}</td></tr>
            ))}</tbody>
          </table>
        )}
        <a className="text-xs underline" href={d.url} target="_blank" rel="noreferrer">{ctx.t("tab.allOrders")}</a>
      </section>
      <section>
        <h3 className="mb-1 font-medium">{ctx.t("tab.invoices")}</h3>
        {d.invoices.length === 0 ? <p className="text-muted-foreground">{ctx.t("tab.invoicesEmpty")}</p> : (
          <>
            <p className="font-medium">{ctx.t("tab.owed", { amounts: d.owed.map((x) => `${x.amount.toFixed(2)} ${x.currency}`).join(", ") })}</p>
            <table className="w-full text-xs">
              <thead><tr className="text-left"><th>{ctx.t("tab.number")}</th><th>{ctx.t("tab.date")}</th><th>{ctx.t("tab.due")}</th><th className="text-right">{ctx.t("tab.total")}</th><th className="text-right">{ctx.t("tab.left")}</th></tr></thead>
              <tbody>{d.invoices.map((i) => (
                <tr key={i.number} className={i.overdueDays > 0 ? "text-destructive" : ""}>
                  <td>{i.number}</td><td>{i.date ?? "-"}</td><td>{i.due ?? "-"}{i.overdueDays > 0 ? ` · ${ctx.t("tab.overdue", { days: i.overdueDays })}` : ""}</td>
                  <td className="text-right">{(i.sign * i.amount).toFixed(2)} {i.currency}</td><td className="text-right">{(i.sign * i.residual).toFixed(2)} {i.currency}</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}
      </section>
      <section>
        <h3 className="mb-1 font-medium">{ctx.t("tab.totals")}</h3>
        {d.totals.length === 0 ? <p className="text-muted-foreground">-</p> : (
          <ul className="text-xs">{d.totals.map((t) => <li key={`${t.year}-${t.currency}`}>{ctx.t("tab.year", { year: t.year, amount: t.amount.toFixed(2), currency: t.currency })}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
```

`ui/OrderPanel.tsx`, after the `order.state`/`order.missing` line:

```tsx
          {l.imported && <div className="text-muted-foreground">{ctx.t("order.imported")}</div>}
          {l.movedNotified && <div className="text-amber-600">{ctx.t("order.moved")}</div>}
```

`plugin.ts`: `import { AccountTab } from "./ui/AccountTab";`; `version: "0.4.0"`; description ends with `…brings their status back; imports confirmed Odoo orders and shows the customer's orders, open invoices and totals on the account.`; after `x.accountPanel(...)` add `x.accountTab({ id: "odoo", title: "tab.title", component: AccountTab });`.

Messages — new `tab` section and two `order` keys:

en:
```json
  "tab": {
    "title": "Odoo", "notLinked": "Not linked to an Odoo customer", "asOf": "As of {date}", "notYet": "Not read from Odoo yet",
    "orders": "Orders", "ordersEmpty": "No orders in Odoo", "allOrders": "All orders in Odoo", "invoices": "Open invoices", "invoicesEmpty": "Nothing to pay",
    "owed": "Owed: {amounts}", "overdue": "{days} days overdue", "totals": "Confirmed orders without VAT", "year": "{year}: {amount} {currency}",
    "number": "Number", "odoo": "Odoo", "date": "Date", "due": "Due", "total": "Total", "left": "Left to pay", "status": "Status"
  }
```
`order`: `"imported": "Imported from Odoo"`, `"moved": "Customer changed in Odoo"`.

cz:
```json
  "tab": {
    "title": "Odoo", "notLinked": "Není propojeno se zákazníkem v Odoo", "asOf": "Stav k {date}", "notYet": "Z Odoo zatím nenačteno",
    "orders": "Objednávky", "ordersEmpty": "Žádné objednávky v Odoo", "allOrders": "Všechny objednávky v Odoo", "invoices": "Neuhrazené faktury", "invoicesEmpty": "Nic k úhradě",
    "owed": "Dluží: {amounts}", "overdue": "{days} dní po splatnosti", "totals": "Potvrzené objednávky bez DPH", "year": "{year}: {amount} {currency}",
    "number": "Číslo", "odoo": "Odoo", "date": "Datum", "due": "Splatnost", "total": "Celkem", "left": "Zbývá uhradit", "status": "Stav"
  }
```
`order`: `"imported": "Importováno z Odoo"`, `"moved": "V Odoo se změnil zákazník"`.

de:
```json
  "tab": {
    "title": "Odoo", "notLinked": "Nicht mit einem Odoo-Kunden verknüpft", "asOf": "Stand {date}", "notYet": "Noch nicht aus Odoo gelesen",
    "orders": "Aufträge", "ordersEmpty": "Keine Aufträge in Odoo", "allOrders": "Alle Aufträge in Odoo", "invoices": "Offene Rechnungen", "invoicesEmpty": "Nichts offen",
    "owed": "Offen: {amounts}", "overdue": "{days} Tage überfällig", "totals": "Bestätigte Aufträge ohne MwSt.", "year": "{year}: {amount} {currency}",
    "number": "Nummer", "odoo": "Odoo", "date": "Datum", "due": "Fällig", "total": "Gesamt", "left": "Offen", "status": "Status"
  }
```
`order`: `"imported": "Aus Odoo importiert"`, `"moved": "Kunde in Odoo geändert"`.

uk:
```json
  "tab": {
    "title": "Odoo", "notLinked": "Не пов'язано з клієнтом в Odoo", "asOf": "Станом на {date}", "notYet": "Ще не прочитано з Odoo",
    "orders": "Замовлення", "ordersEmpty": "Немає замовлень в Odoo", "allOrders": "Усі замовлення в Odoo", "invoices": "Неоплачені рахунки", "invoicesEmpty": "Нічого до оплати",
    "owed": "Заборгованість: {amounts}", "overdue": "Прострочено на {days} дн.", "totals": "Підтверджені замовлення без ПДВ", "year": "{year}: {amount} {currency}",
    "number": "Номер", "odoo": "Odoo", "date": "Дата", "due": "Термін", "total": "Разом", "left": "До оплати", "status": "Статус"
  }
```
`order`: `"imported": "Імпортовано з Odoo"`, `"moved": "В Odoo змінився клієнт"`.

Docs (`odoo-connector.mdx`): after the "When sending fails" list, add:

```mdx
## Orders from Odoo

Every sync also brings in the **confirmed** Odoo orders of customers linked to an account, including everything from before the link. Quotations and orders cancelled before they were imported stay out. An imported order:

- is read-only in the CRM, numbered from the CRM's order series, owned by the account's owner, with the Odoo order date, currency and note;
- has the product lines of products the CRM knows, at Odoo's unit price. Notes, section headings and down payments are skipped; a product the CRM does not have is left out and the order note says how many lines are not shown. VAT comes from the CRM product, so the CRM total can differ slightly; the order's **Odoo** panel then shows Odoo's total;
- follows Odoo's status like an order sent from the CRM, and its lines are updated when they change in Odoo.

Orders the CRM sent to Odoo are never imported again. If an imported order moves to another customer in Odoo, the CRM order keeps its account, its panel says "Customer changed in Odoo" and admins get one email. At most 200 orders are imported per sync; a large first import spreads over several syncs. An order that cannot be imported (for example its currency does not exist in the CRM) is listed on the admin page and tried again on every sync.

### The Odoo tab on the account

Linked accounts get an **Odoo** tab: the account's orders that exist in Odoo (newest 50, with the Odoo number, total without VAT and status), the open invoices and credit notes with what is owed (overdue ones in red), and the confirmed orders without VAT for this year and last year. The tab shows the data of the last sync ("As of …") and opens even when Odoo is down.
```

- [ ] **Step 4: Run** `pnpm exec jest plugins/odoo-connector __tests__/plugins` and `pnpm exec tsc --noEmit -p .` and `pnpm exec eslint plugins/odoo-connector`. Expected: all pass, tsc 0, lint 0.

- [ ] **Step 5: Commit**

```bash
test "$(git branch --show-current)" = feat/odoo-connector-orders-in && git add plugins/odoo-connector apps/docs/content/docs/admins/plugins/odoo-connector.mdx && git commit -m "feat(odoo-connector): Odoo tab on the account, imported orders on the order panel (0.4.0)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Live check against GIPS (read only) on a clone of the local CRM

**Files:** none in the repo. Driver at `.superpowers/live/run-sync.ts` (git-ignored).

Prerequisite: Pavel's go for the live check. GIPS is only read; nothing in this part writes to Odoo.

- [ ] **Step 1: Clone the local database** (never run this on the main `nextcrm` DB):

```bash
docker exec nextcrm-dev-postgres psql -U postgres -c "CREATE DATABASE nextcrm_3b TEMPLATE nextcrm"
```

Expected: `CREATE DATABASE`. If it fails because of open connections, stop the dev server first.

- [ ] **Step 2: Point a dev environment at the clone** — env file in the scratchpad from `~/development/Next.js/nextcrm-app/.env` with `DATABASE_URL` ending in `/nextcrm_3b`, `RESEND_API_KEY` unset, port 3001. Apply this branch's migrations (none expected): `pnpm exec prisma migrate status`.

- [ ] **Step 3: Driver** `.superpowers/live/run-sync.ts`:

```ts
import { findPlugin } from "@/lib/plugins/registry";
import { runIfEnabled } from "@/lib/plugins/inngest";
import { invalidatePluginCache } from "@/lib/plugins/state";
import { runSync } from "@/plugins/odoo-connector/sync";
import { jsonClient } from "@/plugins/odoo-connector/odoo";

(async () => {
  const plugin = findPlugin("odoo-connector")!;
  invalidatePluginCache();
  const r = await runIfEnabled(plugin, async (ctx) => runSync(ctx as never, jsonClient(ctx as never), new Date()));
  console.log(JSON.stringify(r));
  process.exit(0);
})();
```

- [ ] **Step 4: Dry run.** `UPDATE "InstalledPlugin" SET settings = settings || '{"dryRun": true}' WHERE id='odoo-connector'` on `nextcrm_3b`; run the driver with `npx tsx`. Expected: plugin log has one "Dry run: would import Odoo order …" per confirmed GIPS order of a linked customer (about 153), no CRM order created.

- [ ] **Step 5: Import.** Set `dryRun` false; run the driver twice. Expected: first run `orders.imported` ≈ 153; second run `imported` 0. SQL checks on `nextcrm_3b`: EXTERNAL orders count = confirmed GIPS orders of linked customers (MCP `search_count`); per-customer counts and the sum of `subtotal` vs Odoo `amount_untaxed` per customer (differences only where lines were skipped, each explained by the note); no duplicate `externalRef`.

- [ ] **Step 6: Chrome** on http://localhost:3001 (test-otp sign-in): the Odoo tab on three customers (one with overdue invoices, compare with Odoo), one imported order's panel ("Imported from Odoo"), the admin page imports line.

- [ ] **Step 7: Clean up.** Stop the dev server; `docker exec nextcrm-dev-postgres psql -U postgres -c "DROP DATABASE nextcrm_3b"`; remove the driver. Results go into the PR body.
