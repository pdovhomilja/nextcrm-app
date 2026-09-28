import { redirectRecipients } from "@/lib/email/redirect";

describe("redirectRecipients — non-prod email safety", () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("rewrites a single recipient to EMAIL_REDIRECT_TO in non-prod", () => {
    process.env.EMAIL_REDIRECT_TO = "qa-inbox@example.com";
    delete process.env.VERCEL_ENV; // dev / not a prod deploy
    expect(redirectRecipients("real@customer.com")).toBe("qa-inbox@example.com");
  });

  it("rewrites an array of recipients to a single test inbox", () => {
    process.env.EMAIL_REDIRECT_TO = "qa-inbox@example.com";
    process.env.VERCEL_ENV = "preview"; // QA
    expect(redirectRecipients(["a@x.com", "b@y.com"])).toEqual(["qa-inbox@example.com"]);
  });

  it("does NOT redirect a production deploy even if EMAIL_REDIRECT_TO is set (fail-safe)", () => {
    process.env.EMAIL_REDIRECT_TO = "qa-inbox@example.com";
    process.env.VERCEL_ENV = "production";
    expect(redirectRecipients("real@customer.com")).toBe("real@customer.com");
  });

  it("does not redirect when EMAIL_REDIRECT_TO is unset", () => {
    delete process.env.EMAIL_REDIRECT_TO;
    process.env.VERCEL_ENV = "preview";
    expect(redirectRecipients("real@customer.com")).toBe("real@customer.com");
    expect(redirectRecipients(["a@x.com"])).toEqual(["a@x.com"]);
  });
});
