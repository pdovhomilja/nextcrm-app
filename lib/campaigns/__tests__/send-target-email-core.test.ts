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
