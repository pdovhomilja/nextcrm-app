import type { RecordData } from "@nextcrm/plugin-sdk";
import { onOrderUpdated, sendOrder, sweepOrders } from "../orders-out";
import { K, type OrderLink } from "../store";
import { order as oxoOrder } from "./fake-oxo";
import { mk, now } from "./helpers";

const crmOrder = (over: RecordData = {}): RecordData => ({
  id: "o1", number: "ORD-2026-0001", status: "READY", source: "CRM", externalRef: null, accountId: "a1", ownerId: "u1", currency: "CZK",
  requestedDeliveryDate: "2026-10-20T00:00:00.000Z", note: "Ráno", priceListId: "L242",
  lines: [{ productId: "p537", sku: "533002", productName: "K ČKS Jahoda", quantity: "6", unitPrice: "757.76" }], ...over,
});
const answer = (over = {}) => oxoOrder(501, { number: "PRO0501", crmNumber: "ORD-2026-0001", customerId: 222, lines: [{ id: 1, productId: 11, quantity: "6", deliveredQty: "0", unitPrice: "757.76", discount: "0", listPrice: "900", belowList: true }], ...over });

async function setup(opts: { post?: (b: any) => any; linked?: boolean; order?: RecordData; settings?: Record<string, unknown> } = {}) {
  const t = mk({ post: opts.post ?? (() => ({ status: 201, body: answer() })) }, {
    accounts: [{ id: "a1", name: "Puffbox s.r.o.", company_id: "19737955", vat: "CZ19737955", billing_street: "Ulice 1", billing_city: "Praha", billing_postal_code: "11000", billing_country: "CZ", deletedAt: null }],
    users: [{ id: "u1", name: "Jana Obchodní" }], orders: [crmOrder(opts.order)],
  }, { sendOrders: true, ...opts.settings });
  await t.ctx.store.set(K.product("p537"), { oxoId: 11, ref: "537", templateId: null, categoryRef: null });
  await t.ctx.store.set(K.pricelist(3), { priceListId: "L242", ref: "242", name: "Retail_STARTER", currency: "CZK", hash: "x", syncedAt: "x", isActive: true });
  if (opts.linked !== false) {
    await t.ctx.store.set(K.customer(222), { accountId: "a1" });
    await t.ctx.store.set(K.account("a1"), { customerId: 222, syncedAt: "x", priceListId: 3, addresses: [{ id: 223, odooId: 155, name: "Sklad", street: "Dlouhá 1", city: "Praha", zip: "110 00", country: null, active: true }] });
  }
  return t;
}

describe("orders out", () => {
  it("sends a READY order once: body, SENT with oxo: ref, link with below-list lines", async () => {
    const t = await setup({ order: { shipping_street: "dlouhá 1", shipping_city: "Praha", shipping_postal_code: "11000" } });
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("sent");
    expect(t.oxo.calls.find((c) => c.method === "POST")?.body).toEqual({
      crmNumber: "ORD-2026-0001", customerId: 222, deliveryAddressId: 223, priceListId: 3, currency: "CZK", requestedDate: "2026-10-20",
      note: "Ráno", salesRep: "Jana Obchodní", lines: [{ productId: 11, quantity: "6", unitPrice: "757.76" }],
    });
    expect(t.data.orders[0]).toMatchObject({ status: "SENT", externalRef: "oxo:501" });
    expect(await t.ctx.store.get<OrderLink>(K.order("o1"))).toMatchObject({ oxoId: 501, number: "PRO0501", belowList: ["533002"], delivery: "none" });
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("skipped");
  });

  it("an unlinked account goes inline; the answer links it, with the new delivery address", async () => {
    const t = await setup({ linked: false, order: { shipping_street: "Nová 5", shipping_city: "Brno", shipping_postal_code: "60200", shipping_country: "CZ" },
      post: () => ({ status: 201, body: answer({ customerId: 900, deliveryAddressId: 901, priceListId: null }) }) });
    await sendOrder(t.ctx, t.client, "o1", now);
    const body = t.oxo.calls.find((c) => c.method === "POST")?.body;
    expect([body.customerId, body.customer, body.deliveryAddress]).toEqual([undefined,
      { name: "Puffbox s.r.o.", ico: "19737955", dic: "CZ19737955", street: "Ulice 1", city: "Praha", zip: "11000", country: "Czechia" },
      { name: "Puffbox s.r.o.", street: "Nová 5", city: "Brno", zip: "60200", country: "Czechia" }]);
    expect(await t.ctx.store.get(K.customer(900))).toEqual({ accountId: "a1" });
    expect((await t.ctx.store.get<{ customerId: number; addresses: { id: number }[] }>(K.account("a1")))).toMatchObject({ customerId: 900, addresses: [{ id: 901, street: "Nová 5" }] });
  });

  it("timeout then repeat: waits, then the same body gets 200 and the CRM has one SENT order", async () => {
    const bodies: unknown[] = [];
    const t = await setup({ post: (b) => { bodies.push(b); return { status: 200, body: answer() }; } });
    const real = t.ctx.http.fetch;
    let first = true;
    // The first POST dies at the network level, as a timeout does after OXO ERP stored the order.
    t.ctx.http.fetch = async (url: string, init?: RequestInit & { timeoutMs?: number }) => {
      if (init?.method === "POST" && first) { first = false; bodies.push(JSON.parse(String(init.body))); throw new Error("The operation was aborted due to timeout"); }
      return real(url, init);
    };
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("waiting");
    expect([t.data.orders[0].status, (await t.ctx.store.get<{ lastError: string }>(K.send("o1")))?.lastError]).toEqual(["READY", "OXO ERP unreachable: The operation was aborted due to timeout"]);
    expect(await sweepOrders(t.ctx, t.client, now)).toBe(1);
    expect(bodies[0]).toEqual(bodies[1]);
    expect([t.data.orders[0].status, await t.ctx.store.get(K.send("o1"))]).toEqual(["SENT", null]);
  });

  it("a day of waiting emails admins once", async () => {
    const t = await setup();
    t.oxo.down = true;
    await sendOrder(t.ctx, t.client, "o1", now);
    await sendOrder(t.ctx, t.client, "o1", new Date(now.getTime() + 25 * 3_600_000));
    await sendOrder(t.ctx, t.client, "o1", new Date(now.getTime() + 26 * 3_600_000));
    expect(t.ctx.notifications.map((x) => x.subject)).toEqual(["mail.stuckSubject"]);
  });

  it("503 writes_disabled pauses sending with one email; the order stays READY and nothing else is tried", async () => {
    const t = await setup({ post: () => new Response(JSON.stringify({ error: "writes_disabled", message: "Zápisy jsou vypnuté." }), { status: 503 }) });
    t.data.orders.push(crmOrder({ id: "o2", number: "ORD-2026-0002" }));
    expect(await sweepOrders(t.ctx, t.client, now)).toBe(1);
    expect([t.data.orders[0].status, await t.ctx.store.get(K.sendPaused) !== null]).toEqual(["READY", true]);
    expect(await sendOrder(t.ctx, t.client, "o2", now)).toBe("skipped");
    expect(t.ctx.notifications.map((x) => x.subject)).toEqual(["mail.pausedSubject"]);
  });

  it("409 and 422 end in SYNC_FAILED with OXO ERP's message and one email", async () => {
    for (const [status, error] of [[409, "conflict"], [422, "invalid"]] as const) {
      const t = await setup({ post: () => new Response(JSON.stringify({ error, message: "Objednávka ORD-2026-0001 už existuje jako PRO0500 s jinými řádky." }), { status }) });
      expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("failed");
      expect(t.data.orders[0].status).toBe("SYNC_FAILED");
      expect((await t.ctx.store.get<{ reason: string }>(K.failed("o1")))?.reason).toContain("PRO0500");
      expect(t.ctx.notifications.map((x) => x.subject)).toEqual(["mail.orderFailedSubject"]);
    }
  });

  it("a line whose product is not from OXO ERP fails without a POST", async () => {
    const t = await setup({ order: { lines: [{ productId: "pX", sku: "CRM-ONLY", quantity: "1", unitPrice: "1" }] } });
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("failed");
    expect(t.oxo.calls.filter((c) => c.method === "POST")).toEqual([]);
    expect((await t.ctx.store.get<{ reason: string }>(K.failed("o1")))?.reason).toBe("orders.notOxoProduct");
  });

  it("nothing is sent while sendOrders is off or in dry run", async () => {
    for (const settings of [{ sendOrders: false }, { dryRun: true }]) {
      const t = await setup({ settings });
      expect([await sendOrder(t.ctx, t.client, "o1", now), await sweepOrders(t.ctx, t.client, now)]).toEqual(["skipped", 0]);
      expect(t.oxo.calls).toEqual([]);
    }
  });

  it("the hook sends on READY and clears old state when an order leaves READY or SYNC_FAILED", async () => {
    const t = await setup({ order: { status: "DRAFT" } });
    await t.ctx.store.set(K.send("o1"), { lastError: "x", waitingSince: "x" });
    await t.ctx.store.set(K.failed("o1"), { reason: "x", at: "x" });
    await onOrderUpdated({ entity: "order", operation: "updated", recordId: "o1" }, t.ctx);
    expect([await t.ctx.store.get(K.send("o1")), await t.ctx.store.get(K.failed("o1"))]).toEqual([null, null]);
  });
});
