import {
  normalizeTargetType, resolveTargetTitle, requiredIdentityField,
  hasRequiredIdentity, fieldsForType, isFieldForType, fieldLabel,
} from "@/lib/crm/target-type";

describe("target-type config", () => {
  it("normalizes unknown/missing type to COMPANY", () => {
    expect(normalizeTargetType(null)).toBe("COMPANY");
    expect(normalizeTargetType("nonsense")).toBe("COMPANY");
    expect(normalizeTargetType("INDIVIDUAL")).toBe("INDIVIDUAL");
  });

  it("resolves the title by type", () => {
    expect(resolveTargetTitle({ type: "COMPANY", company: "Acme Inc" })).toBe("Acme Inc");
    expect(resolveTargetTitle({ type: "INDIVIDUAL", first_name: "Ada", last_name: "Lovelace" }))
      .toBe("Ada Lovelace");
    expect(resolveTargetTitle({ type: "INDIVIDUAL", last_name: "Lovelace" })).toBe("Lovelace");
  });

  it("keys required identity off type, not 'either field'", () => {
    expect(requiredIdentityField("COMPANY")).toBe("company");
    expect(requiredIdentityField("INDIVIDUAL")).toBe("last_name");
    expect(hasRequiredIdentity({ type: "COMPANY", company: "Acme", last_name: "" })).toBe(true);
    expect(hasRequiredIdentity({ type: "COMPANY", company: "" })).toBe(false);
    expect(hasRequiredIdentity({ type: "INDIVIDUAL", last_name: "Lovelace", company: "" })).toBe(true);
    expect(hasRequiredIdentity({ type: "INDIVIDUAL", last_name: "" })).toBe(false);
    // Cross-field regression guards: reject when "wrong" field is populated
    expect(hasRequiredIdentity({ type: "COMPANY", company: "", last_name: "Lovelace" })).toBe(false);
    expect(hasRequiredIdentity({ type: "INDIVIDUAL", last_name: "", company: "Acme" })).toBe(false);
  });

  it("returns per-type field groups and labels", () => {
    expect(isFieldForType("COMPANY", "industry")).toBe(true);
    expect(isFieldForType("COMPANY", "position")).toBe(false);
    expect(isFieldForType("INDIVIDUAL", "position")).toBe(true);
    expect(isFieldForType("INDIVIDUAL", "industry")).toBe(false);
    expect(fieldsForType("COMPANY")).toContain("company");
    expect(fieldLabel("INDIVIDUAL", "company")).toBe("Employer");
    expect(fieldLabel("COMPANY", "company")).toBe("Company name");
  });
});
