import { definePlugin } from "@nextcrm/plugin-sdk";
import { settingsSchema } from "./settings";
import { beforeCreate, beforeUpdate } from "./rules";
import { onCreated, onDeleted, onUpdated } from "./hooks";
import { expire, install, sendNotices, upgrade } from "./jobs";
import { onOrderChanged } from "./orders";
import { ProtectionTab } from "./ui/ProtectionTab";
import { ProtectionPanel } from "./ui/ProtectionPanel";
import { ExpiringPage } from "./ui/ExpiringPage";
import { ConflictsSection } from "./ui/ConflictsSection";

export default definePlugin({
  id: "account-protection",
  name: "Account protection",
  version: "0.2.0",
  sdk: "^0.2.0",
  description: "One owner per company registration number, with protection windows, owner history and a daily expiry job.",
  permissions: ["accounts:read", "accounts:write", "activities:read", "orders:read", "users:read", "notify"],
  settings: settingsSchema,
  extensions: (x) => {
    x.rule("account", "beforeCreate", beforeCreate, { onError: "block" });
    x.rule("account", "beforeUpdate", beforeUpdate, { onError: "block" });
    x.after("account", "created", (input, ctx) => onCreated(input, ctx));
    x.after("account", "updated", (input, ctx) => onUpdated(input, ctx));
    x.after("account", "deleted", (input, ctx) => onDeleted(input, ctx));
    x.after("order", "created", (input, ctx) => onOrderChanged(input, ctx));
    x.after("order", "updated", (input, ctx) => onOrderChanged(input, ctx));
    x.cron("expire", "0 6 * * *", (ctx) => expire(ctx, new Date()));
    x.cron("notices", "*/5 * * * *", (ctx) => sendNotices(ctx, new Date()));
    x.accountTab({ id: "protection", title: "tab.title", component: ProtectionTab });
    x.accountPanel({ id: "protection", component: ProtectionPanel });
    x.page({ path: "expiring", title: "expiring.title", component: ExpiringPage, roles: ["manager", "admin"], nav: { label: "expiring.nav" } });
    x.adminSection(ConflictsSection);
  },
  onInstall: (ctx) => install(ctx, new Date()),
  onUpgrade: (ctx) => upgrade(ctx, new Date()),
});
