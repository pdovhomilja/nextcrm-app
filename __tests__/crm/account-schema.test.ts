import { accountSchema } from "@/app/[locale]/(routes)/crm/accounts/table-data/schema";

// Regression: an account whose contact has a NULL first_name must parse.
// `crm_Contacts.first_name` is nullable in the DB, and a company contact
// (e.g. one created by a target -> opportunity conversion) legitimately has
// no person first name. The account row-schema is parsed during render
// (data-table-row-actions: `accountSchema.parse(row.original)`); when it
// rejected null it threw a ZodError -> React #419 -> "This page couldn't load"
// on the accounts list and on the opportunity detail (which renders AccountsView).
describe("accountSchema — contact name nullability", () => {
  const base = {
    id: "acc-1",
    name: "Ball Event Center",
  };

  it("accepts a contact with a null first_name (company contact)", () => {
    const result = accountSchema.safeParse({
      ...base,
      contacts: [{ first_name: null, last_name: "Ball Event Center" }],
    });
    expect(result.success).toBe(true);
  });

  it("still accepts a present first_name and an undefined one", () => {
    expect(
      accountSchema.safeParse({
        ...base,
        contacts: [{ first_name: "Jane", last_name: "Doe" }],
      }).success
    ).toBe(true);
    expect(
      accountSchema.safeParse({
        ...base,
        contacts: [{ last_name: "Doe" }],
      }).success
    ).toBe(true);
  });

  it("still requires last_name (non-null in the DB)", () => {
    const result = accountSchema.safeParse({
      ...base,
      contacts: [{ first_name: "Jane", last_name: null }],
    });
    expect(result.success).toBe(false);
  });
});
