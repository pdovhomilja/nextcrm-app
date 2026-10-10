import { definePlugin } from "@nextcrm/plugin-sdk";
import { secretsSchema, settingsSchema } from "./settings";
import { jsonClient, testConnection } from "./odoo";
import { runSync, scheduledSync } from "./sync";
import { loadPriceLists, queueJob, runQueued } from "./jobs";
import { AdminSection } from "./ui/AdminSection";
import { NeedsOwnerPage } from "./ui/NeedsOwnerPage";
import { AccountPanel } from "./ui/AccountPanel";
import { ProductPanel } from "./ui/ProductPanel";

export default definePlugin({
  id: "odoo-connector",
  name: "Odoo connector",
  version: "0.2.0",
  sdk: "^0.2.3",
  description: "Imports customers, their people and the product catalog with price lists from an Odoo ERP and keeps them current. Reads only.",
  permissions: ["http", "accounts:read", "accounts:write", "contacts:read", "contacts:write", "users:read", "notify", "products:read", "products:write", "priceLists:read", "priceLists:write"],
  settings: settingsSchema,
  secrets: secretsSchema,
  extensions: (x) => {
    x.cron("sync", "*/5 * * * *", async (ctx) => { const now = new Date(); await runQueued(ctx, now); await scheduledSync(ctx, now); });
    x.adminAction({ id: "test", label: "admin.test", handler: (ctx) => testConnection(ctx) });
    x.adminAction({ id: "sync", label: "admin.syncNow", handler: (ctx) => queueJob(ctx, "sync", new Date()) });
    x.adminAction({ id: "lists", label: "admin.loadLists", handler: (ctx) => loadPriceLists(ctx) });
    x.adminAction({ id: "compare", label: "admin.compare", handler: (ctx) => queueJob(ctx, "compare", new Date()) });
    x.accountPanel({ id: "odoo", component: AccountPanel });
    x.productPanel({ id: "odoo", component: ProductPanel });
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
