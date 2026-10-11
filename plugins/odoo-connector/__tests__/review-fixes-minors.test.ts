import { localTime, settingsSchema } from "../settings";
import { onOrderUpdated, sendOrder } from "../orders-out";
import { syncOrderStatuses } from "../orders-status";
import { runSync, summaryText } from "../sync";
import { orderPanelData } from "../ui/data";
import { K, type OrderLink, type RunSummary } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const link = (over: Partial<OrderLink> = {}): OrderLink => ({ odooId: 900, name: "S00900", state: "sale", sentAt: now.toISOString(), total: null, totalDiffers: false, priceDiffs: [], deliveries: [], invoices: [], created: [], checkedAt: now.toISOString(), ...over });
const sale = (over: Record<string, unknown> = {}) => ({ id: 900, name: "S00900", state: "sale", delivery_status: false, invoice_status: "no", amount_total: 200, invoice_ids: [], picking_ids: [], ...over });
const hook = (ctx: Parameters<typeof onOrderUpdated>[1]) => onOrderUpdated({ recordId: "o1" } as never, ctx);

describe("times carry the instance's time zone", () => {
  it("defaults to UTC and rejects an unknown zone", () => {
    expect(settingsSchema.parse({ url: "https://o.example.com", database: "db" }).timeZone).toBe("UTC");
    expect(() => settingsSchema.parse({ url: "https://o.example.com", database: "db", timeZone: "Mars/Base" })).toThrow();
  });

  it("formats in the zone and names it", () => {
    const { ctx } = mkOrders({ settings: { timeZone: "Europe/Prague" } });
    expect(localTime(ctx, "2026-10-11T17:30:00.000Z")).toBe("2026-10-11 19:30 (Europe/Prague)");
    expect(localTime(mkOrders().ctx, "2026-10-11T17:30:00.000Z")).toBe("2026-10-11 17:30 (UTC)");
  });

  it("the day-long-wait email uses it", async () => {
    const { ctx, client } = mkOrders({ settings: { timeZone: "Europe/Prague" }, sales: { fail: { "sale.order/create": 502 } } });
    await ctx.store.set(K.send("o1"), { attempts: 0, lastError: "x", waitingSince: "2026-10-12T06:00:00.000Z" });
    const t = jest.spyOn(ctx, "t");
    await sendOrder(ctx, client, "o1", now);
    expect(t).toHaveBeenCalledWith("mail.stuckText", expect.objectContaining({ since: "2026-10-12 08:00 (Europe/Prague)" }));
    expect(ctx.notifications.length).toBe(1);
  });
});

describe("a failing notification email never fails the run", () => {
  it("logs a warning and carries on", async () => {
    const { ctx, client, data } = mkOrders({ sales: { fail: { "sale.order/create": 400 } } });
    (ctx as unknown as { notify: unknown }).notify = async () => { throw new Error("mail down"); };
    await ctx.store.set(K.send("o1"), { attempts: 4, lastError: "x", waitingSince: null });
    await expect(sendOrder(ctx, client, "o1", now)).resolves.toBe("refused");
    expect(data.orders[0].status).toBe("SYNC_FAILED");
    expect(ctx.logs.some((l) => l.level === "warn" && l.message.includes("mail down"))).toBe(true);
  });
});

it("the last-run line includes order counts", () => {
  const { ctx } = mkOrders();
  const s: RunSummary = { at: "x", ok: true, dryRun: false, created: 0, updated: 0, unchanged: 0, skipped: 0, conflicts: 0, failed: 0, orders: { checked: 3, moved: 1 } };
  expect(summaryText(ctx, s)).toBe("admin.counts · admin.orderCounts");
  expect(summaryText(ctx, { ...s, orders: { checked: 0, moved: 0 } })).toBe("admin.counts");
});

describe("an order that leaves READY or SYNC_FAILED drops its old state", () => {
  it("reopened: attempts and waiting are cleared, so a resubmit starts at attempt 1", async () => {
    const { ctx, data } = mkOrders({ settings: { sendOrders: false } });
    await ctx.store.set(K.send("o1"), { attempts: 3, lastError: "refused", waitingSince: null });
    data.orders[0].status = "DRAFT";
    await hook(ctx);
    expect(await ctx.store.get(K.send("o1"))).toBeNull();
  });

  it("cancelled after failing: the failure note is cleared", async () => {
    const { ctx, data } = mkOrders();
    await ctx.store.set(K.failed("o1"), { reason: "x", at: "y" });
    data.orders[0].status = "CANCELLED";
    await hook(ctx);
    expect(await ctx.store.get(K.failed("o1"))).toBeNull();
  });

  it("keeps the failure note while the order is SYNC_FAILED", async () => {
    const { ctx, data } = mkOrders();
    await ctx.store.set(K.failed("o1"), { reason: "x", at: "y" });
    data.orders[0].status = "SYNC_FAILED";
    await hook(ctx);
    expect(await ctx.store.get(K.failed("o1"))).toEqual({ reason: "x", at: "y" });
  });

  it("the panel shows waiting only on READY and failed only on SYNC_FAILED", async () => {
    const { ctx, data } = mkOrders();
    await ctx.store.set(K.send("o1"), { attempts: 1, lastError: "x", waitingSince: null });
    await ctx.store.set(K.failed("o1"), { reason: "x", at: "y" });
    data.orders[0].status = "DRAFT";
    expect(await orderPanelData(ctx, "o1")).toBeNull();
    data.orders[0].status = "SYNC_FAILED";
    expect(await orderPanelData(ctx, "o1")).toMatchObject({ waiting: null, failed: { reason: "x" } });
  });
});

describe("status sync", () => {
  const setup = async (status: string, s: Record<string, unknown> | null, l: Partial<OrderLink> = {}) => {
    const m = mkOrders({ orders: [order({ status, externalRef: "900" })], sales: { orders: s ? [sale(s) as never] : [] } });
    await m.ctx.store.set(K.order("o1"), link(l));
    return m;
  };

  it("logs 'went back' once, not every cycle", async () => {
    const { ctx, client } = await setup("INVOICED", { invoice_status: "to invoice" });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect(ctx.logs.filter((l) => l.message.includes("went back"))).toHaveLength(1);
  });

  it("marks finished orders done and stops reading them", async () => {
    const { ctx, client } = await setup("SENT", { state: "cancel" });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect((await ctx.store.get<OrderLink>(K.order("o1")))!.done).toBe(true);
    const get = jest.spyOn(ctx.data.orders, "get");
    expect(await syncOrderStatuses({ ctx, client, dry: false, now })).toEqual({ checked: 0, moved: 0 });
    expect(get).not.toHaveBeenCalled();
  });

  it("an Odoo order it cannot find is not cancelled: panel says so, admins get one email", async () => {
    const { ctx, client, data } = await setup("CONFIRMED", null);
    await syncOrderStatuses({ ctx, client, dry: false, now });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect(data.orders[0].status).toBe("CONFIRMED");
    expect((await ctx.store.get<OrderLink>(K.order("o1")))!.state).toBe("missing");
    expect(ctx.notifications.map((n) => n.subject)).toEqual(["mail.missingSubject"]);
  });

  it("an order found again after missing picks up its state", async () => {
    const { ctx, client, sales } = await setup("CONFIRMED", null);
    await syncOrderStatuses({ ctx, client, dry: false, now });
    sales.orders.push(sale({ delivery_status: "full" }) as never);
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect((await ctx.store.get<OrderLink>(K.order("o1")))!.state).toBe("sale");
  });

  it("the run summary still carries the counts", async () => {
    const { ctx, client } = await setup("SENT", {});
    const catalog = jest.spyOn(require("../catalog"), "syncCatalog").mockResolvedValue(undefined);
    expect((await runSync(ctx, client, now)).orders).toEqual({ checked: 1, moved: 1, imported: 0 });
    catalog.mockRestore();
  });
});
