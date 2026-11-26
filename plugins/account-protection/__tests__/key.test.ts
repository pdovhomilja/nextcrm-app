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

it("ignores punctuation in the number", () => {
  expect(numberKey({ company_id: "27.082.440", billing_country: "CZ" }, "CZ")).toBe("CZ:27082440");
  expect(numberKey({ company_id: "27-082-440", billing_country: "CZ" }, "CZ")).toBe("CZ:27082440");
  expect(numberKey({ company_id: "HRB-1234", billing_country: "Germany" }, "CZ")).toBe("DE:HRB1234");
});

it("reads a CZ VAT number as the IČO, over the billing country", () => {
  expect(numberKey({ company_id: "CZ27082440", billing_country: "Slovakia" }, "CZ")).toBe("CZ:27082440");
  expect(numberKey({ company_id: "cz 270 82 440", billing_country: "Germany" }, "CZ")).toBe("CZ:27082440");
});

it("leaves a number unmatched when it cannot be a Czech IČO", () => {
  expect(numberKey({ company_id: "CZ8001011234", billing_country: "CZ" }, "CZ")).toBeNull();   // personal VAT number
  expect(numberKey({ company_id: "123456789", billing_country: "CZ" }, "CZ")).toBeNull();
  expect(numberKey({ company_id: "ABC123", billing_country: "" }, "CZ")).toBeNull();
});

it("does not derive a company key from a Slovak VAT number (it is not the IČO)", () => {
  expect(numberKey({ company_id: "SK2020317068", billing_country: "Slovakia" }, "CZ")).toBeNull();
  expect(numberKey({ company_id: "SK 2020317068", billing_country: "CZ" }, "CZ")).toBeNull();
  expect(numberKey({ company_id: "35757442", billing_country: "Slovakia" }, "CZ")).toBe("SK:35757442");
});

it("treats other two-letter prefixes as part of the number", () => {
  expect(numberKey({ company_id: "SC123456", billing_country: "GB" }, "CZ")).toBe("GB:SC123456");
  expect(numberKey({ company_id: "NI123456", billing_country: "GB" }, "CZ")).toBe("GB:NI123456");
  expect(numberKey({ company_id: "DE123456789", billing_country: "Germany" }, "CZ")).toBe("DE:DE123456789");
});

it("keeps foreign numbers as typed, upper-cased and without spaces", () => {
  expect(numberKey({ company_id: "hrb 1234", billing_country: "Germany" }, "CZ")).toBe("DE:HRB1234");
});

it("returns null without a registration number", () => {
  expect(numberKey({ company_id: "   ", billing_country: "CZ" }, "CZ")).toBeNull();
  expect(numberKey({ company_id: null }, "CZ")).toBeNull();
  expect(numberKey({}, "CZ")).toBeNull();
});
