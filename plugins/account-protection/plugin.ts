import { definePlugin } from "@nextcrm/plugin-sdk";
import { settingsSchema } from "./settings";
import { beforeCreate, beforeUpdate } from "./rules";
import { onCreated, onDeleted, onUpdated } from "./hooks";
import { expire, install, sendNotices } from "./jobs";

export default definePlugin({
  id: "account-protection",
  name: "Account protection",
  version: "0.1.0",
  sdk: "^0.1.1",
  description: "One owner per company registration number, with protection windows, owner history and a daily expiry job.",
  permissions: ["accounts:read", "accounts:write", "activities:read", "users:read", "notify"],
  settings: settingsSchema,
  extensions: (x) => {
    x.rule("account", "beforeCreate", beforeCreate, { onError: "block" });
    x.rule("account", "beforeUpdate", beforeUpdate, { onError: "block" });
    x.after("account", "created", (input, ctx) => onCreated(input, ctx));
    x.after("account", "updated", (input, ctx) => onUpdated(input, ctx));
    x.after("account", "deleted", (input, ctx) => onDeleted(input, ctx));
    x.cron("expire", "0 6 * * *", (ctx) => expire(ctx, new Date()));
    x.cron("notices", "*/5 * * * *", (ctx) => sendNotices(ctx, new Date()));
  },
  onInstall: (ctx) => install(ctx, new Date()),
});
