import plugin from "../plugin";
import { onOrderUpdated, sendOrder, sweepOrders } from "../orders-out";
import { K } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const later = (min: number) => new Date(now.getTime() + min * 60_000);

describe("failure kinds (spec § 5)", () => {
  it("Odoo down: no attempt counted, the order waits READY", async () => {
    const { ctx, client, data } = mkOrders({ sales: { fail: { "res.partner/create": 503 } } });
    await sendOrder(ctx, client, "o1", now);
    await sendOrder(ctx, client, "o1", later(5));
    expect(data.orders[0].status).toBe("READY");
    expect(await ctx.store.get(K.send("o1"))).toMatchObject({ attempts: 0, waitingSince: now.toISOString() });
    expect(ctx.notifications).toHaveLength(0);
  });

  it("401/403: pauses sending for every order and notifies once", async () => {
    const { ctx, client, data, calls } = mkOrders({ orders: [order(), order({ id: "o2", number: "ORD-2026-0002" })], sales: { fail: { "res.partner/create": 403 } } });
    await sendOrder(ctx, client, "o1", now);
    const before = calls.length;
    await sendOrder(ctx, client, "o2", now);
    expect(calls.length).toBe(before);
    expect(data.orders.map((o) => o.status)).toEqual(["READY", "READY"]);
    expect(await ctx.store.get(K.sendPaused)).toMatchObject({ at: now.toISOString() });
    expect(ctx.notifications).toHaveLength(1);
  });

  it("5 refusals of one order: SYNC_FAILED and one notification", async () => {
    const { ctx, client, data } = mkOrders({ sales: { fail: { "res.partner/create": 422 } } });
    for (let i = 1; i <= 4; i++) {
      await sendOrder(ctx, client, "o1", later(i));
      expect(await ctx.store.get(K.send("o1"))).toMatchObject({ attempts: i });
      expect(data.orders[0].status).toBe("READY");
    }
    await sendOrder(ctx, client, "o1", later(5));
    expect(data.orders[0].status).toBe("SYNC_FAILED");
    expect(await ctx.store.get(K.send("o1"))).toBeNull();
    expect(await ctx.store.get(K.failed("o1"))).toMatchObject({ reason: expect.stringContaining("422") });
    expect(ctx.notifications).toHaveLength(1);
  });

  it("Retry gives a failed order 5 fresh attempts", async () => {
    const { ctx, client, data, sales } = mkOrders({ sales: { fail: { "res.partner/create": 422 } } });
    for (let i = 1; i <= 5; i++) await sendOrder(ctx, client, "o1", later(i));
    data.orders[0].status = "READY";           // core Retry: SYNC_FAILED → READY
    delete sales.fail["res.partner/create"];
    await sendOrder(ctx, client, "o1", later(10));
    expect(data.orders[0].status).toBe("SENT");
    expect(await ctx.store.get(K.failed("o1"))).toBeNull();
  });
});

describe("repeat safety (criterion 11)", () => {
  for (const step of ["res.partner/create", "sale.order/create"]) {
    it(`one partner, one delivery address, one order after a crash right after ${step}`, async () => {
      const { ctx, client, data, sales } = mkOrders({
        orders: [order({ shipping_street: "Depot 5", shipping_city: "Brno", shipping_postal_code: "60200" })],
        sales: { fail: { [step]: "after" } },
      });
      await sendOrder(ctx, client, "o1", now);
      expect(data.orders[0].status).toBe("READY");
      await sendOrder(ctx, client, "o1", later(5));
      expect(data.orders[0].status).toBe("SENT");
      expect(sales.partners.filter((p) => p.type === "contact")).toHaveLength(1);
      expect(sales.partners.filter((p) => p.type === "delivery")).toHaveLength(1);
      expect(sales.orders).toHaveLength(1);
    });
  }

  it("event and sweep at the same moment create one Odoo order", async () => {
    const { ctx, client, sales } = mkOrders();
    await Promise.all([sendOrder(ctx, client, "o1", now), sendOrder(ctx, client, "o1", now)]);
    expect(sales.orders).toHaveLength(1);
  });
});

describe("sweep and hook", () => {
  it("sweeps READY orders without an Odoo id, oldest first", async () => {
    const { ctx, client, sales } = mkOrders({ orders: [
      order({ id: "o2", number: "N2", createdAt: "2026-10-13T07:30:00.000Z" }),
      order({ id: "o1", number: "N1", createdAt: "2026-10-13T07:00:00.000Z" }),
      order({ id: "o3", number: "N3", status: "SENT", externalRef: "77" }),
    ] });
    expect(await sweepOrders(ctx, client, now)).toBe(2);
    expect(sales.orders.map((o) => o.origin)).toEqual(["N1", "N2"]);
  });

  it("does not sweep in dry run or with sendOrders off", async () => {
    for (const settings of [{ dryRun: true }, { sendOrders: false }]) {
      const { ctx, client, calls } = mkOrders({ settings });
      expect(await sweepOrders(ctx, client, now)).toBe(0);
      expect(calls).toHaveLength(0);
    }
  });

  it("ignores updates of orders that are not READY (Review Focus 5)", async () => {
    const { ctx, calls } = mkOrders({ orders: [order({ status: "SENT", externalRef: "77" })] });
    const claim = jest.spyOn(ctx.store, "claim");
    await onOrderUpdated({ entity: "order", operation: "updated", recordId: "o1", changed: ["status"] }, ctx);
    expect(claim).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("sends when an order becomes READY", async () => {
    const { ctx, sales } = mkOrders();
    await onOrderUpdated({ entity: "order", operation: "updated", recordId: "o1", changed: ["status"] }, ctx);
    expect(sales.orders).toHaveLength(1);
  });

  it("registers the hook and keeps one cron", () => {
    expect(plugin.extensions.afters.map((a) => [a.entity, a.operation])).toEqual([["order", "updated"]]);
    expect(plugin.extensions.crons.map((c) => c.id)).toEqual(["sync"]);
  });
});
