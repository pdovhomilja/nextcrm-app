jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1", role: "user" })),
  AuthenticationError: class AuthenticationError extends Error {},
}));
const mockProviders: { plugin: unknown; provider: Record<string, unknown> }[] = [];
jest.mock("@/lib/plugins/slots", () => ({ getCompanyRegistryProviders: jest.fn(async () => mockProviders) }));
const mockLogError = jest.fn();
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ log: { error: mockLogError } })) }));
jest.mock("next-intl/server", () => ({ getTranslations: jest.fn(async () => (k: string) => k) }));
import { canValidateVat, validateVatNumber } from "@/actions/crm/accounts/lookup-company";

const lookup = jest.fn();
const validateVat = jest.fn();
const plugin = { definition: { id: "registry-x" } };

beforeEach(() => {
  mockProviders.length = 0;
  validateVat.mockReset();
  mockLogError.mockReset();
});

it("canValidateVat is true only when an enabled provider implements validateVat", async () => {
  mockProviders.push({ plugin, provider: { countries: ["SK"], lookup } });
  await expect(canValidateVat()).resolves.toBe(false);
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  await expect(canValidateVat()).resolves.toBe(true);
});

it("asks for the country code before calling any provider", async () => {
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  await expect(validateVatNumber("27082440")).resolves.toEqual({ result: "noPrefix" });
  await expect(validateVatNumber("  ")).resolves.toEqual({ result: "noPrefix" });
  expect(validateVat).not.toHaveBeenCalled();
});

it("reports noProvider when no enabled provider can validate", async () => {
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup } });
  await expect(validateVatNumber("CZ27082440")).resolves.toEqual({ result: "noProvider" });
});

it("uses a provider whatever its countries and maps true/false", async () => {
  mockProviders.push({ plugin, provider: { countries: ["SK"], lookup } });
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  validateVat.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(validateVatNumber("DE 123 456 789")).resolves.toEqual({ result: "valid" });
  expect(validateVat).toHaveBeenCalledWith("DE123456789", { log: { error: mockLogError } });
  await expect(validateVatNumber("DE123456789")).resolves.toEqual({ result: "invalid" });
});

it("reports unavailable and logs when the provider throws", async () => {
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  validateVat.mockRejectedValueOnce(new Error("VIES unavailable: MS_UNAVAILABLE"));
  await expect(validateVatNumber("CZ27082440")).resolves.toEqual({ result: "unavailable" });
  expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining("MS_UNAVAILABLE"));
});

it("reports unavailable when the plugin context cannot be built", async () => {
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  const { createPluginContext } = jest.requireMock("@/lib/plugins/context");
  createPluginContext.mockRejectedValueOnce(new Error("state unavailable"));
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(validateVatNumber("CZ27082440")).resolves.toEqual({ result: "unavailable" });
  expect(spy).toHaveBeenCalledWith("[VAT_VALIDATE]", expect.any(Error));
  spy.mockRestore();
});
