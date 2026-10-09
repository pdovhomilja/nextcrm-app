const enabled = jest.fn();
jest.mock("@/lib/plugins/state", () => ({ getEnabledPlugins: () => enabled() }));
jest.mock("@/lib/plugins/i18n", () => ({ translatePluginMessage: (id: string, key: string, _p: unknown, locale: string) => `${id}:${key}:${locale}` }));

import { getPluginNavItems } from "@/lib/plugins/nav";

const page = (path: string, roles: string[], nav?: { label: string }) => ({ path, title: "t", component: () => null, roles, nav });

it("lists nav pages of enabled plugins the role may open", async () => {
  enabled.mockResolvedValue([
    { definition: { id: "demo", extensions: { pages: [page("expiring", ["manager", "admin"], { label: "nav.expiring" }), page("hidden", ["user", "manager", "admin"])] } } },
  ]);
  await expect(getPluginNavItems("manager", "cz")).resolves.toEqual([{ title: "demo:nav.expiring:cz", url: "/p/demo/expiring" }]);
  await expect(getPluginNavItems("user", "en")).resolves.toEqual([]);
});
