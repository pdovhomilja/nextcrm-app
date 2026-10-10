import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { needsOwner, panelData } from "../ui/data";
import { settingsSchema, type Ctx } from "../settings";
import { K } from "../store";

const S = settingsSchema.parse({ url: "https://odoo.example.com", database: "db" });

it("lists linked accounts without an owner, with the Odoo salesperson", async () => {
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: S, data: { accounts: [
    { id: "a1", name: "No owner", assigned_to: null, deletedAt: null }, { id: "a2", name: "Owned", assigned_to: "u1", deletedAt: null },
  ] } }) as unknown as Ctx;
  await ctx.store.set(K.account("a1"), { partnerId: 1, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: "Rep X" });
  await ctx.store.set(K.account("a2"), { partnerId: 2, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: null });
  expect(await needsOwner(ctx)).toEqual([{ accountId: "a1", name: "No owner", salesperson: "Rep X" }]);
});

it("builds the panel only for linked accounts", async () => {
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: S }) as unknown as Ctx;
  expect(await panelData(ctx, "a1")).toBeNull();
  await ctx.store.set(K.account("a1"), { partnerId: 42, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: null, archived: true });
  expect(await panelData(ctx, "a1")).toEqual({ partnerId: 42, url: "https://odoo.example.com/odoo/contacts/42", syncedAt: "2026-10-13T08:00:00.000Z", archived: true, notCustomer: false });
});
