import { definePlugin } from "@nextcrm/plugin-sdk";
import { secretsSchema, settingsSchema } from "./settings";
import { jsonClient, testConnection } from "./odoo";
import { runSync, scheduledSync } from "./sync";
import { loadPriceLists, queueJob, runQueued } from "./jobs";
import { onOrderUpdated, sweepOrders } from "./orders-out";
import { AdminSection } from "./ui/AdminSection";
import { NeedsOwnerPage } from "./ui/NeedsOwnerPage";
import { AccountPanel } from "./ui/AccountPanel";
import { ProductPanel } from "./ui/ProductPanel";
import { OrderPanel } from "./ui/OrderPanel";
import { AccountTab } from "./ui/AccountTab";

export default definePlugin({
  id: "odoo-connector",
  name: "Odoo connector",
  version: "0.4.2",
  sdk: "^0.2.5",
  description: "Imports customers, their people and the product catalog with price lists from an Odoo ERP and keeps them current; sends READY orders to Odoo as draft sale orders and brings their status back; imports confirmed Odoo orders and shows the customer's orders, open invoices and totals on the account.",
  permissions: ["http", "accounts:read", "accounts:write", "contacts:read", "contacts:write", "users:read", "notify", "products:read", "products:write", "priceLists:read", "priceLists:write", "orders:read", "orders:write"],
  settings: settingsSchema,
  secrets: secretsSchema,
  extensions: (x) => {
    x.cron("sync", "*/5 * * * *", async (ctx) => { const now = new Date(); await runQueued(ctx, now); await sweepOrders(ctx, jsonClient(ctx), now); await scheduledSync(ctx, now); });
    x.after("order", "updated", (input, ctx) => onOrderUpdated(input, ctx));
    x.adminAction({ id: "test", label: "admin.test", handler: (ctx) => testConnection(ctx) });
    x.adminAction({ id: "sync", label: "admin.syncNow", handler: (ctx) => queueJob(ctx, "sync", new Date()) });
    x.adminAction({ id: "lists", label: "admin.loadLists", handler: (ctx) => loadPriceLists(ctx) });
    x.adminAction({ id: "compare", label: "admin.compare", handler: (ctx) => queueJob(ctx, "compare", new Date()) });
    x.accountPanel({ id: "odoo", component: AccountPanel });
    x.accountTab({ id: "odoo", title: "tab.title", component: AccountTab });
    x.productPanel({ id: "odoo", component: ProductPanel });
    x.orderPanel({ id: "odoo", component: OrderPanel });
    x.page({ path: "needs-owner", title: "needsOwner.title", component: NeedsOwnerPage, roles: ["manager", "admin"], nav: { label: "needsOwner.nav" } });
    x.adminSection(AdminSection);
  },
  // Ruling 7: an install never fails on Odoo; the cron imports on its first good run.
  onInstall: async (ctx) => {
    try {
      await runSync(ctx, jsonClient(ctx), new Date());
    } catch (e) {
      ctx.log.error(`Install sync failed: ${String(e)}`);
    }
  },
});
