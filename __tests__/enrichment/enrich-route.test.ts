import { validateEnrichRequest } from "@/app/api/crm/contacts/enrich/validate";

describe("validateEnrichRequest", () => {
  it("returns error when contactId missing", () => {
    const result = validateEnrichRequest({ contactId: "", fields: [{ name: "industry" }] });
    expect(result).toBe("contactId and fields are required");
  });
  it("returns error when fields is empty array", () => {
    const result = validateEnrichRequest({ contactId: "abc", fields: [] });
    expect(result).toBe("contactId and fields are required");
  });
  it("returns null when valid", () => {
    const result = validateEnrichRequest({ contactId: "abc", fields: [{ name: "industry" }] });
    expect(result).toBeNull();
  });
});
