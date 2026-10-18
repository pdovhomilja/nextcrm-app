import { definePlugin } from "@nextcrm/plugin-sdk";
import { secretsSchema, settingsSchema } from "./settings";
import { oxoClient, testConnection } from "./oxo";
import { runSync, scheduledSync } from "./sync";
import { loadPriceLists, queueJob, runQueued } from "./jobs";
import { onOrderUpdated, sweepOrders } from "./orders-out";
import { AdminSection } from "./ui/AdminSection";
import { NeedsOwnerPage } from "./ui/NeedsOwnerPage";
import { AccountPanel } from "./ui/AccountPanel";
import { AccountTab } from "./ui/AccountTab";
import { ProductPanel } from "./ui/ProductPanel";
import { OrderPanel } from "./ui/OrderPanel";

export default definePlugin({
  id: "oxo-erp-connector",
  name: "OXO ERP connector",
  version: "0.1.0",
  sdk: "^0.2.6",
  description: "Imports customers, products and price lists from OXO ERP and takes over the rows odoo-connector made; sends READY orders to OXO ERP, brings delivery back as the order status and imports orders made in OXO ERP.",
  permissions: ["http", "accounts:read", "accounts:write", "users:read", "notify", "products:read", "products:write", "priceLists:read", "priceLists:write", "orders:read", "orders:write"],
  settings: settingsSchema,
  secrets: secretsSchema,
  extensions: (x) => {
    x.cron("sync", "*/5 * * * *", async (ctx) => {
      const now = new Date();
      const client = oxoClient(ctx);
      await runQueued(ctx, now, client);
      await sweepOrders(ctx, client, now);
      await scheduledSync(ctx, now, client);
    });
    x.after("order", "updated", (input, ctx) => onOrderUpdated(input, ctx));
    x.adminAction({ id: "test", label: "admin.test", handler: (ctx) => testConnection(ctx) });
    x.adminAction({ id: "sync", label: "admin.syncNow", handler: (ctx) => queueJob(ctx, new Date()) });
    x.adminAction({ id: "lists", label: "admin.loadLists", handler: (ctx) => loadPriceLists(ctx) });
    x.accountPanel({ id: "oxo-erp", component: AccountPanel });
    x.accountTab({ id: "oxo-erp", title: "tab.title", component: AccountTab });
    x.productPanel({ id: "oxo-erp", component: ProductPanel });
    x.orderPanel({ id: "oxo-erp", component: OrderPanel });
    x.page({ path: "needs-owner", title: "needsOwner.title", component: NeedsOwnerPage, roles: ["manager", "admin"], nav: { label: "needsOwner.nav" } });
    x.adminSection(AdminSection);
  },
  // An install never fails on OXO ERP; the first dry run happens on install or on "Sync now".
  onInstall: async (ctx) => {
    try {
      await runSync(ctx, oxoClient(ctx), new Date());
    } catch (e) {
      ctx.log.error(`Install sync failed: ${String(e)}`);
    }
  },
});
