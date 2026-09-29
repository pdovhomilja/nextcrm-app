import { planContactPersist } from "@/lib/enrichment/e2b/apply-result";

// The enrichment agent now returns local-business owners/managers who often
// have a name + title but no email or LinkedIn. Those must still be persisted
// ("named"), while a truly anonymous row is skipped.
describe("planContactPersist", () => {
  it("uses the keyed (upsert) path when email or LinkedIn is present", () => {
    expect(
      planContactPersist({ name: "Jane Doe", email: "jane@acme.com", linkedinUrl: null })
    ).toBe("keyed");
    expect(
      planContactPersist({ name: null, email: null, linkedinUrl: "https://linkedin.com/in/jane" })
    ).toBe("keyed");
    // email/LinkedIn win even when a name is also present
    expect(
      planContactPersist({ name: "Jane", email: "jane@acme.com", linkedinUrl: "x" })
    ).toBe("keyed");
  });

  it("persists a name-only contact (owner/manager with no email or LinkedIn)", () => {
    expect(
      planContactPersist({ name: "Dr. Pat Smith", email: null, linkedinUrl: null })
    ).toBe("named");
  });

  it("skips a wholly-anonymous contact", () => {
    expect(planContactPersist({ name: null, email: null, linkedinUrl: null })).toBe("skip");
    expect(planContactPersist({ name: "   ", email: null, linkedinUrl: null })).toBe("skip");
  });
});
