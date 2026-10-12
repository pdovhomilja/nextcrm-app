jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import resendHelper from "@/lib/resend";
import { resolveOtpFromAddress, sendOtpEmail } from "@/lib/auth-otp-mail";

const resendHelperMock = resendHelper as jest.Mock;
const send = jest.fn();

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_APP_NAME: "VenSai CRM" };
  delete process.env.EMAIL_FROM;
  delete process.env.RESEND_FROM_EMAIL;
  resendHelperMock.mockResolvedValue({ emails: { send } });
  send.mockResolvedValue({ data: { id: "email_1" }, error: null });
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("resolveOtpFromAddress", () => {
  it("uses EMAIL_FROM and wraps it with the app name", () => {
    process.env.EMAIL_FROM = "noreply@vensai.example";
    expect(resolveOtpFromAddress()).toBe("VenSai CRM <noreply@vensai.example>");
  });

  it("unwraps an address that is already formatted", () => {
    process.env.EMAIL_FROM = "VenSai <noreply@vensai.example>";
    expect(resolveOtpFromAddress()).toBe("VenSai CRM <noreply@vensai.example>");
  });

  it("falls back to RESEND_FROM_EMAIL", () => {
    process.env.RESEND_FROM_EMAIL = "codes@vensai.example";
    expect(resolveOtpFromAddress()).toBe("VenSai CRM <codes@vensai.example>");
  });

  it("rejects the placeholder sender", () => {
    process.env.EMAIL_FROM = "noreply@domain.com";
    expect(() => resolveOtpFromAddress()).toThrow(/not configured/);
  });
});

describe("sendOtpEmail", () => {
  it("throws the Resend error instead of treating a rejected send as success", async () => {
    process.env.EMAIL_FROM = "noreply@vensai.example";
    send.mockResolvedValue({
      data: null,
      error: { message: "The domain is not verified." },
    });

    await expect(sendOtpEmail("person@gmail.com", "123456")).rejects.toThrow(
      "The domain is not verified."
    );
  });
});
