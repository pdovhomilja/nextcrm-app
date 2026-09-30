import {
  resolveTargetRecipient,
  buildTargetUnsubscribeUrl,
} from "@/lib/campaigns/send-target-email-core";

jest.mock("@/lib/prisma", () => ({ prismadb: {} }));
jest.mock("resend", () => ({ Resend: jest.fn() }));

describe("resolveTargetRecipient", () => {
  it("prefers email, then company_email, then personal_email", () => {
    expect(resolveTargetRecipient({ email: "a@x.com", company_email: "b@x.com", personal_email: "c@x.com" })).toBe("a@x.com");
    expect(resolveTargetRecipient({ email: null, company_email: "b@x.com", personal_email: "c@x.com" })).toBe("b@x.com");
    expect(resolveTargetRecipient({ email: null, company_email: null, personal_email: "c@x.com" })).toBe("c@x.com");
  });
  it("returns null when there is no address", () => {
    expect(resolveTargetRecipient({})).toBeNull();
  });

  // Regression: the Update-target form stores blank fields as "" (not null), and
  // `??` does NOT fall through on "" — so a COMPANY target with email:"" but a real
  // company_email was wrongly reported as having no address. Treat blank/whitespace
  // as absent, and trim the winner.
  it("treats empty/whitespace fields as absent and falls through", () => {
    expect(
      resolveTargetRecipient({ email: "", personal_email: "", company_email: "info@x.com" })
    ).toBe("info@x.com");
    expect(resolveTargetRecipient({ email: "   ", company_email: "info@x.com" })).toBe("info@x.com");
    expect(resolveTargetRecipient({ email: "", company_email: "", personal_email: "" })).toBeNull();
    expect(resolveTargetRecipient({ email: " a@x.com " })).toBe("a@x.com");
  });
});

describe("buildTargetUnsubscribeUrl", () => {
  const saved = process.env.NEXTAUTH_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = saved;
  });
  it("builds the URL from NEXTAUTH_URL", () => {
    process.env.NEXTAUTH_URL = "https://crm.example.com";
    expect(buildTargetUnsubscribeUrl("tok")).toBe(
      "https://crm.example.com/api/crm/targets/unsubscribe?token=tok"
    );
  });
  it("is null (fail-closed) when NEXTAUTH_URL is unset or empty", () => {
    delete process.env.NEXTAUTH_URL;
    expect(buildTargetUnsubscribeUrl("tok")).toBeNull();
    process.env.NEXTAUTH_URL = "";
    expect(buildTargetUnsubscribeUrl("tok")).toBeNull();
  });
});
