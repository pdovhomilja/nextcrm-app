import { validateEnrichRequest } from "@/app/api/crm/targets/enrich/validate";

describe("validateEnrichRequest (targets)", () => {
  it("returns error when targetId missing", () => {
    const result = validateEnrichRequest({ contactId: "", fields: [{ name: "position" }] });
    expect(result).toBe("contactId and fields are required");
  });
  it("returns error when fields is empty array", () => {
    const result = validateEnrichRequest({ contactId: "abc", fields: [] });
    expect(result).toBe("contactId and fields are required");
  });
  it("returns null when valid", () => {
    const result = validateEnrichRequest({ contactId: "abc", fields: [{ name: "position" }] });
    expect(result).toBeNull();
  });
});
