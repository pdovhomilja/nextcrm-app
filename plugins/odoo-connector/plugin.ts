import { definePlugin } from "@nextcrm/plugin-sdk";
import { secretsSchema, settingsSchema } from "./settings";
import { jsonClient, testConnection } from "./odoo";
import { runSync, scheduledSync, summaryText } from "./sync";
import { AdminSection } from "./ui/AdminSection";
import { NeedsOwnerPage } from "./ui/NeedsOwnerPage";
import { AccountPanel } from "./ui/AccountPanel";

export default definePlugin({
  id: "odoo-connector",
  name: "Odoo connector",
  version: "0.1.0",
  sdk: "^0.2.2",
  description: "Imports customers and their people from an Odoo ERP and keeps them current. Reads only.",
  permissions: ["http", "accounts:read", "accounts:write", "contacts:read", "contacts:write", "users:read", "notify"],
  settings: settingsSchema,
  secrets: secretsSchema,
  extensions: (x) => {
    x.cron("sync", "*/5 * * * *", async (ctx) => { await scheduledSync(ctx, new Date()); });
    x.adminAction({ id: "test", label: "admin.test", handler: (ctx) => testConnection(ctx) });
    x.adminAction({ id: "sync", label: "admin.syncNow", handler: async (ctx) => summaryText(ctx, await runSync(ctx, jsonClient(ctx), new Date())) });
    x.accountPanel({ id: "odoo", component: AccountPanel });
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
