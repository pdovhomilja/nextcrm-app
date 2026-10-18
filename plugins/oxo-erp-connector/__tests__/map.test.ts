import { accountFields, changedFields, countryCode, countryName, ref, sameAddress } from "../map";
import { customer } from "./fake-oxo";

it("keeps the Odoo id as ref for mirrored rows, oxo:<id> for native ones", () => {
  expect([ref({ id: 222, odooId: 154 }), ref({ id: 9, odooId: null })]).toEqual(["154", "oxo:9"]);
});

it("turns Odoo's English country names into ISO codes and back", () => {
  expect([countryCode("Czech Republic"), countryCode("Czechia"), countryCode("slovakia"), countryCode("Atlantis"), countryCode(null)]).toEqual(["CZ", "CZ", "SK", null, null]);
  expect(countryName("CZ")).toBe("Czechia");
});

it("maps a customer to account fields; unknown country stays null", () => {
  const f = accountFields(customer(1, { name: " Puffbox s.r.o. ", ico: "19737955", dic: "CZ19737955", street: "Ulice 1", city: "Praha", zip: "110 00", phone: "777", country: "Atlantis" }));
  expect(f).toEqual({ name: "Puffbox s.r.o.", company_id: "19737955", vat: "CZ19737955", billing_street: "Ulice 1", billing_city: "Praha", billing_postal_code: "110 00", billing_country: null, email: null, office_phone: "777" });
});

it("an empty value never clears a CRM value", () => {
  expect(changedFields({ name: "A", email: "a@x.cz", vat: null }, { name: "B", email: null, vat: "CZ1" })).toEqual({ name: "B", vat: "CZ1" });
});

it("compares addresses ignoring case, extra spaces and spaces in the zip", () => {
  expect(sameAddress({ street: "Dlouhá  1", city: "praha", zip: "110 00" }, { street: "dlouhá 1", city: "Praha", zip: "11000" })).toBe(true);
  expect(sameAddress({ street: "Dlouhá 1", city: "Praha", zip: "11000" }, { street: "Dlouhá 2", city: "Praha", zip: "11000" })).toBe(false);
});
