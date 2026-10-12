import { definePlugin } from "@nextcrm/plugin-sdk";
const Comp = () => null;
const plugins = [
  { source: "public", messages: {}, definition: definePlugin({ id: "p-one", name: "One", version: "1.0.0", sdk: "^0.2.0", description: "", permissions: [],
    extensions: (x) => {
      x.accountTab({ id: "all", title: "t.all", component: Comp });
      x.accountTab({ id: "mgr", title: "t.mgr", component: Comp, roles: ["manager", "admin"] });
      x.accountPanel({ id: "panel", component: Comp });
      x.page({ path: "expiring", title: "p.exp", component: Comp, roles: ["manager"] });
      x.page({ path: "a/b", title: "p.ab", component: Comp });
      x.companyRegistry({ countries: ["CZ"], lookup: async () => null });
    } }) },
];
jest.mock("@/lib/plugins/state", () => ({ getEnabledPlugins: jest.fn(async () => plugins) }));
import { findPluginPage, getAccountPanels, getAccountTabs, getCompanyRegistryProviders } from "@/lib/plugins/slots";

it("filters tabs and panels by role", async () => {
  expect((await getAccountTabs("user")).map((s) => s.tab.id)).toEqual(["all"]);
  expect((await getAccountTabs("manager")).map((s) => s.tab.id)).toEqual(["all", "mgr"]);
  expect(await getAccountPanels("user")).toHaveLength(1);
});

it("finds pages by joined path and role", async () => {
  expect(await findPluginPage("p-one", ["expiring"], "user")).toBeNull();
  expect((await findPluginPage("p-one", ["expiring"], "manager"))?.page.path).toBe("expiring");
  expect((await findPluginPage("p-one", ["a", "b"], "user"))?.page.path).toBe("a/b");
  expect(await findPluginPage("other", ["a", "b"], "admin")).toBeNull();
});

it("lists registry providers of enabled plugins", async () => {
  expect((await getCompanyRegistryProviders()).map((r) => r.provider.countries)).toEqual([["CZ"]]);
});
