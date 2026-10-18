import { syncOrderStatuses, targetStatus } from "../orders-status";
import { runSync } from "../sync";
import { K, type OrderLink } from "../store";
import { order } from "./fake-oxo";
import { mk, now } from "./helpers";

const crm = (id: string, status: string, externalRef: string | null, source = "CRM") => ({ id, number: `ORD-${id}`, status, externalRef, source });

it("maps OXO ERP state and delivery to a CRM status; draft and approval keep it", () => {
  expect([
    targetStatus({ state: "cancel", delivery: "none" }), targetStatus({ state: "sale", delivery: "partial" }),
    targetStatus({ state: "done", delivery: "full" }), targetStatus({ state: "approval", delivery: "none" }), targetStatus({ state: "sent", delivery: "none" }),
  ]).toEqual(["CANCELLED", "CONFIRMED", "DELIVERED", null, null]);
});

describe("status sweep", () => {
  it("moves orders forward only, by OXO ERP id; keeps the link current", async () => {
    const { ctx, client, data } = mk({ orders: [order(501, { delivery: "full", deliveries: [{ number: "OUT/1", state: "DONE", doneAt: "2026-10-18T07:00:00.000Z" }] }), order(502, { state: "sale" })] },
      { orders: [crm("o1", "SENT", "oxo:501"), crm("o2", "DELIVERED", "oxo:502")] });
    const out = await syncOrderStatuses({ ctx, client, dry: false, now });
    expect(out).toEqual({ checked: 2, moved: 1 });
    expect(data.orders.map((o) => o.status)).toEqual(["DELIVERED", "DELIVERED"]);
    expect(await ctx.store.get<OrderLink>(K.order("o1"))).toMatchObject({ oxoId: 501, delivery: "full", deliveries: [{ number: "OUT/1", state: "DONE" }] });
  });

  it("pre-switch order: a CRM order sent to Odoo is tracked by its Odoo id", async () => {
    const { ctx, client, data, oxo } = mk({ orders: [order(40, { odooId: 176, state: "cancel" })] }, { orders: [crm("o9", "CONFIRMED", "176")] });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect(oxo.calls.map((c) => c.params.odooIds ?? c.params.ids)).toEqual(["176"]);
    expect(data.orders[0].status).toBe("CANCELLED");
  });

  it("an order OXO ERP no longer has keeps its status; admins are told once", async () => {
    const { ctx, client, data } = mk({}, { orders: [crm("o1", "SENT", "oxo:999")] });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect([data.orders[0].status, ctx.notifications.map((n) => n.subject)]).toEqual(["SENT", ["mail.missingSubject"]]);
    expect((await ctx.store.get<OrderLink>(K.order("o1")))?.state).toBe("missing");
  });

  it("skips PAID, CANCELLED, READY and orders without an OXO ERP or Odoo ref; dry run writes nothing", async () => {
    const { ctx, client, data, oxo } = mk({ orders: [order(1, { delivery: "full" })] }, { orders: [crm("a", "PAID", "oxo:1"), crm("b", "READY", null), crm("c", "SENT", "oxo:1")] });
    expect(await syncOrderStatuses({ ctx, client, dry: true, now })).toEqual({ checked: 1, moved: 0 });
    expect([data.orders[2].status, await ctx.store.list("")]).toEqual(["SENT", []]);
    expect(oxo.calls).toHaveLength(1);
  });

  it("runs inside the sync and counts into the summary", async () => {
    const { ctx, client } = mk({ orders: [order(501, { delivery: "full" })] }, { orders: [crm("o1", "SENT", "oxo:501")] });
    const s = await runSync(ctx, client, now);
    expect([s.orders?.checked, s.orders?.moved]).toEqual([1, 1]);
  });
});
