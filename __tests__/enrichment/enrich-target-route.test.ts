import { validateEnrichRequest } from "@/app/api/crm/targets/enrich/validate";

describe("validateEnrichRequest (targets)", () => {
  it("returns error when targetId missing", () => {
    const result = validateEnrichRequest({ targetId: "", fields: [{ name: "position" }] });
    expect(result).toBe("targetId and fields are required");
  });
  it("returns error when fields is empty array", () => {
    const result = validateEnrichRequest({ targetId: "abc", fields: [] });
    expect(result).toBe("targetId and fields are required");
  });
  it("returns null when valid", () => {
    const result = validateEnrichRequest({ targetId: "abc", fields: [{ name: "position" }] });
    expect(result).toBeNull();
  });
});
