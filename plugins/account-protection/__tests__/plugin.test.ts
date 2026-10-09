import plugin from "../plugin";

it("declares its permissions, settings and blocking rules", () => {
  expect(plugin.id).toBe("account-protection");
  expect(plugin.sdk).toBe("^0.1.1");
  expect(plugin.permissions).toEqual(["accounts:read", "accounts:write", "activities:read", "users:read", "notify"]);
  expect(plugin.extensions.rules.map((r) => [r.entity, r.operation, r.onError])).toEqual([
    ["account", "beforeCreate", "block"],
    ["account", "beforeUpdate", "block"],
  ]);
  expect(Object.keys(plugin.settings.shape)).toEqual(["protectionDays", "contactDays", "contactTypes", "warnDays", "defaultCountry", "requireNumber"]);
});

it("listens to account created, updated and deleted", () => {
  expect(plugin.extensions.afters.map((a) => `${a.entity}.${a.operation}`)).toEqual(["account.created", "account.updated", "account.deleted"]);
});

it("schedules the expiry and notice jobs and backfills on install", () => {
  expect(plugin.extensions.crons.map((c) => [c.id, c.schedule])).toEqual([["expire", "0 6 * * *"], ["notices", "*/5 * * * *"]]);
  expect(typeof plugin.onInstall).toBe("function");
  expect(typeof plugin.onUpgrade).toBe("function");
  expect(plugin.version).toBe("0.1.1");
});

it("registers the tab, the panel, the Expiring page in the menu and an admin section", () => {
  const e = plugin.extensions;
  expect(e.accountTabs.map((t) => [t.id, t.title, t.roles])).toEqual([["protection", "tab.title", ["user", "manager", "admin"]]]);
  expect(e.accountPanels.map((p) => p.id)).toEqual(["protection"]);
  expect(e.pages.map((p) => [p.path, p.title, p.roles, p.nav])).toEqual([["expiring", "expiring.title", ["manager", "admin"], { label: "expiring.nav" }]]);
  expect(e.adminSections).toHaveLength(1);
});

it("keeps contactTypes a plain text field the platform resets to the default when the stored value is invalid", () => {
  // The platform renders and reads settings field by field: invalid stored value → safeParse(undefined) → default.
  const field = plugin.settings.shape.contactTypes;
  expect(field._zod.def.type).toBe("default");
  expect(field._zod.def.innerType._zod.def.type).toBe("string");
  expect(field.safeParse("sample").success).toBe(false);
  expect(field.safeParse(undefined).data).toBe("visit,meeting");
});
