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
