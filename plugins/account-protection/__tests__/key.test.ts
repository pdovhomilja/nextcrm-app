import { countryCode, numberKey } from "../key";

it.each([
  ["CZ", "CZ"], ["cz", "CZ"], ["Czechia", "CZ"], ["Česko", "CZ"], ["Czech Republic", "CZ"], ["Tschechien", "CZ"], ["Чехія", "CZ"],
  ["Germany", "DE"], ["  Slovakia ", "SK"], ["", "CZ"], [null, "CZ"], ["Atlantis", "CZ"], ["XX", "CZ"],
])("countryCode(%p) → %s", (raw, cc) => expect(countryCode(raw, "CZ")).toBe(cc));

it("builds the same key for the same company typed differently (Review Focus 1)", () => {
  const k = "CZ:27082440";
  expect(numberKey({ company_id: "270 824 40", billing_country: "Czechia" }, "CZ")).toBe(k);
  expect(numberKey({ company_id: "27082440", billing_country: "CZ" }, "CZ")).toBe(k);
  expect(numberKey({ company_id: "27082440", billing_country: "" }, "CZ")).toBe(k);
  expect(numberKey({ company_id: "27082440", billing_country: "Czech Republic" }, "CZ")).toBe(k);
  expect(numberKey({ company_id: "123", billing_country: "CZ" }, "CZ")).toBe("CZ:00000123");
});

it("keeps foreign numbers as typed, upper-cased and without spaces", () => {
  expect(numberKey({ company_id: "hrb 1234", billing_country: "Germany" }, "CZ")).toBe("DE:HRB1234");
});

it("returns null without a registration number", () => {
  expect(numberKey({ company_id: "   ", billing_country: "CZ" }, "CZ")).toBeNull();
  expect(numberKey({ company_id: null }, "CZ")).toBeNull();
  expect(numberKey({}, "CZ")).toBeNull();
});
