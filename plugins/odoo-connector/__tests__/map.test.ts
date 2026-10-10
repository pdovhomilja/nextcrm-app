import { accountFields, changedFields, contactFields, splitName, type OdooPartner } from "../map";

const codes = (id: number) => ({ 56: "CZ", 201: "SK" } as Record<number, string>)[id] ?? null;
const p = (over: Partial<OdooPartner> = {}): OdooPartner => ({
  id: 1, name: "Café Nora s.r.o.", is_company: true, company_registry: "2708 2440", vat: "CZ27082440",
  street: "Hlavní 1", street2: "2. patro", city: "Tábor", zip: "390 01", state_id: [5, "Jihočeský kraj"], country_id: [56, "Czechia"],
  email: "info@nora.example", phone: false, mobile: "+420 777 000 111", function: false, user_id: [9, "Rep One"], parent_id: false,
  type: "contact", active: true, customer_rank: 3, write_date: "2026-10-10 08:00:00", ...over,
});

it("maps a company partner to account fields", () => {
  expect(accountFields(p(), codes, "CZ")).toEqual({
    name: "Café Nora s.r.o.", company_id: "2708 2440", vat: "CZ27082440",
    billing_street: "Hlavní 1, 2. patro", billing_city: "Tábor", billing_postal_code: "390 01", billing_state: "Jihočeský kraj",
    billing_country: "CZ", email: "info@nora.example", office_phone: "+420 777 000 111",
  });
});

it("falls back to the default country and keeps empty fields null", () => {
  const f = accountFields(p({ country_id: false, street2: false, company_registry: false, state_id: false, phone: "123", mobile: false, email: false }), codes, "SK");
  expect([f.billing_country, f.billing_street, f.company_id, f.billing_state, f.office_phone, f.email]).toEqual(["SK", "Hlavní 1", null, null, "123", null]);
});

it("splits person names: last word is the last name", () => {
  expect(splitName("Jana Marie Nováková")).toEqual({ first_name: "Jana Marie", last_name: "Nováková" });
  expect(splitName("Madonna")).toEqual({ first_name: null, last_name: "Madonna" });
  expect(contactFields(p({ name: "Petr Svoboda", email: "p@x.example", phone: "1", mobile: "2", function: "Buyer" }))).toEqual({
    first_name: "Petr", last_name: "Svoboda", email: "p@x.example", office_phone: "1", mobile_phone: "2", position: "Buyer",
  });
});

it("lists only fields whose value differs (Review Focus 3)", () => {
  expect(changedFields({ name: "Old", vat: "CZ1", email: null }, { name: "New", vat: "CZ1", email: null })).toEqual({ name: "New" });
  expect(changedFields({ name: "Same" }, { name: "Same", city: null } as Record<string, unknown>)).toEqual({});
});
