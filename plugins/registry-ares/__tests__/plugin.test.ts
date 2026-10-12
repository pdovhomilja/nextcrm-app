import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import plugin from "../plugin";

it("declares only the http permission and one CZ provider", () => {
  expect(plugin.id).toBe("registry-ares");
  expect(plugin.permissions).toEqual(["http"]);
  expect(plugin.extensions.companyRegistries).toHaveLength(1);
  expect(plugin.extensions.companyRegistries[0].countries).toEqual(["CZ"]);
});

it("wires lookup to ARES and validateVat to VIES", async () => {
  const fetch = jest.fn(async (url: string, _init?: RequestInit) =>
    new Response(JSON.stringify(url.includes("ares.gov.cz") ? { ico: "27082440", obchodniJmeno: "Alza.cz a.s." } : { valid: true }), { status: 200 }));
  const ctx = createTestContext({ pluginId: "registry-ares", fetch });
  const [provider] = plugin.extensions.companyRegistries;
  await expect(provider.lookup("27082440", "CZ", ctx)).resolves.toEqual({ name: "Alza.cz a.s.", registrationNumber: "27082440", country: "CZ" });
  await expect(provider.validateVat!("CZ27082440", ctx)).resolves.toBe(true);
});
