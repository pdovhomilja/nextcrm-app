import {
  resolveCompanyDomain,
  filterByConfidence,
  buildContactUpsertKey,
} from "@/lib/enrichment/e2b/apply-result";

describe("resolveCompanyDomain", () => {
  it("returns website domain when website is provided", () => {
    expect(resolveCompanyDomain({
      companyWebsite: "https://acme.com",
      email: "john@gmail.com",
      companyName: "Acme",
    })).toBe("acme.com");
  });

  it("returns email domain when email is corporate (non-personal)", () => {
    expect(resolveCompanyDomain({
      companyWebsite: null,
      email: "john@acme.com",
      companyName: "Acme",
    })).toBe("acme.com");
  });

  it("returns null when email is personal Gmail", () => {
    expect(resolveCompanyDomain({
      companyWebsite: null,
      email: "john@gmail.com",
      companyName: "Acme",
    })).toBeNull();
  });

  it("returns null when no website and no email", () => {
    expect(resolveCompanyDomain({
      companyWebsite: null,
      email: null,
      companyName: "Acme",
    })).toBeNull();
  });
});

describe("filterByConfidence", () => {
  it("removes fields with confidence below 0.6", () => {
    const result = filterByConfidence(
      { company_website: "https://acme.com", company_phone: "+1 415 000 0000" },
      { company_website: 0.9, company_phone: 0.5 }
    );
    expect(result).toEqual({ company_website: "https://acme.com" });
  });

  it("keeps fields with no confidence entry (assume high)", () => {
    const result = filterByConfidence({ company_name: "Acme" }, {});
    expect(result).toEqual({ company_name: "Acme" });
  });
});

describe("buildContactUpsertKey", () => {
  it("prefers email as dedup key when present", () => {
    expect(buildContactUpsertKey("target-1", { email: "a@b.com", linkedinUrl: null }))
      .toEqual({ targetId_email: { targetId: "target-1", email: "a@b.com" } });
  });

  it("falls back to linkedinUrl when no email", () => {
    expect(buildContactUpsertKey("target-1", { email: null, linkedinUrl: "https://linkedin.com/in/foo" }))
      .toEqual({ targetId_linkedinUrl: { targetId: "target-1", linkedinUrl: "https://linkedin.com/in/foo" } });
  });
});
