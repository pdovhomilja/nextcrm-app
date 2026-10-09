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
