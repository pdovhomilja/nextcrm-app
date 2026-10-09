import { definePlugin } from "@nextcrm/plugin-sdk";
import { settingsSchema } from "./settings";
import { beforeCreate, beforeUpdate } from "./rules";

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
  },
});
