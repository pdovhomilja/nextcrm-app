jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1", role: "user" })),
  AuthenticationError: class AuthenticationError extends Error {},
}));
const lookup = jest.fn();
jest.mock("@/lib/plugins/slots", () => ({
  getCompanyRegistryProviders: jest.fn(async () => [{ plugin: { definition: { id: "registry-x" } }, provider: { countries: ["CZ", "SK"], lookup } }]),
}));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({})) }));
jest.mock("next-intl/server", () => ({ getTranslations: jest.fn(async () => (k: string) => k) }));
import { getRegistryCountries, lookupCompany } from "@/actions/crm/accounts/lookup-company";

it("lists countries of enabled providers", async () => {
  expect(await getRegistryCountries()).toEqual(["CZ", "SK"]);
});

it("returns the provider result or a not-found error", async () => {
  lookup.mockResolvedValueOnce({ name: "Acme s.r.o.", registrationNumber: "12345678", country: "CZ" });
  await expect(lookupCompany("cz", " 12345678 ")).resolves.toEqual({ data: { name: "Acme s.r.o.", registrationNumber: "12345678", country: "CZ" } });
  expect(lookup).toHaveBeenCalledWith("12345678", "CZ", {});
  lookup.mockResolvedValueOnce(null);
  await expect(lookupCompany("CZ", "1")).resolves.toEqual({ error: "registryNotFound" });
  await expect(lookupCompany("DE", "1")).resolves.toEqual({ error: "registryNotFound" });
});
