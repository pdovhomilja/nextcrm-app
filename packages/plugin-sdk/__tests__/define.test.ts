import { z } from "zod";
import { allow, definePlugin, modify, reject } from "../src/define";

const base = {
  id: "demo-plugin",
  name: "Demo",
  version: "1.0.0",
  sdk: "^0.1.0",
  description: "Demo",
  permissions: ["accounts:read" as const],
};

describe("definePlugin", () => {
  it("collects extensions with defaults", () => {
    const Tab = () => null;
    const def = definePlugin({
      ...base,
      settings: z.object({ days: z.number().default(90) }),
      extensions: (x) => {
        x.rule("account", "beforeCreate", () => allow());
        x.rule("lead", "beforeUpdate", () => allow(), { onError: "block", priority: 10 });
        x.cron("nightly", "0 3 * * *", async () => {});
        x.on("crm/account.saved", async () => {});
        x.accountTab({ id: "info", title: "tab.title", component: Tab });
      },
    });
    expect(def.extensions.rules).toHaveLength(2);
    expect(def.extensions.rules[0]).toMatchObject({ entity: "account", onError: "allow", priority: 100 });
    expect(def.extensions.rules[1]).toMatchObject({ onError: "block", priority: 10 });
    expect(def.extensions.accountTabs[0].roles).toEqual(["user", "manager", "admin"]);
    expect(def.secrets.shape).toEqual({});
  });

  it("rejects invalid ids, versions, ranges and duplicates", () => {
    const noop = () => {};
    expect(() => definePlugin({ ...base, id: "Bad_Id", extensions: noop })).toThrow("Invalid plugin id");
    expect(() => definePlugin({ ...base, version: "1.0", extensions: noop })).toThrow("Invalid version");
    expect(() => definePlugin({ ...base, sdk: ">=0.1.0", extensions: noop })).toThrow("sdk must be a caret range");
    expect(() => definePlugin({ ...base, permissions: ["root" as any], extensions: noop })).toThrow("Unknown permission");
    expect(() =>
      definePlugin({ ...base, extensions: (x) => { x.cron("a", "* * * * *", noop); x.cron("a", "* * * * *", noop); } }),
    ).toThrow("Duplicate cron id: a");
    expect(() =>
      definePlugin({ ...base, extensions: (x) => { x.on("e/x", noop); x.on("e/x", noop); } }),
    ).toThrow("Duplicate event handler: e/x");
  });

  it("builds rule results", () => {
    expect(allow()).toEqual({ kind: "allow" });
    expect(reject("err.taken", { date: "1. 1." })).toEqual({ kind: "reject", messageKey: "err.taken", params: { date: "1. 1." } });
    expect(modify({ name: "X" })).toEqual({ kind: "modify", patch: { name: "X" } });
  });
});

it("registers order panels with default roles", () => {
  const def = definePlugin({ ...base, extensions: (x) => x.orderPanel({ id: "sync", component: () => null }) });
  expect(def.extensions.orderPanels).toEqual([expect.objectContaining({ id: "sync", roles: ["user", "manager", "admin"] })]);
  expect(() => definePlugin({ ...base, extensions: (x) => { x.orderPanel({ id: "a", component: () => null }); x.orderPanel({ id: "a", component: () => null }); } })).toThrow("Duplicate order panel id");
});
