import { getAppName } from "@/lib/app-name";
import resendHelper from "@/lib/resend";

export const OTP_EXPIRES_SECONDS = 10 * 60;

/** Bare address from EMAIL_FROM or RESEND_FROM_EMAIL, wrapped with the app name. */
export function resolveOtpFromAddress(): string {
  const raw = (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "")
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!raw || raw === "noreply@domain.com") {
    throw new Error(
      "Login email is not configured. Set EMAIL_FROM to a sender on a domain verified in Resend."
    );
  }

  const bracket = raw.match(/<([^>]+)>/);
  const address = (bracket?.[1] ?? raw).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw new Error(
      "EMAIL_FROM is not a valid sender address. Use a verified Resend address such as noreply@yourdomain.com."
    );
  }

  return `${getAppName()} <${address}>`;
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const from = resolveOtpFromAddress();
  const appName = getAppName();
  const minutes = Math.round(OTP_EXPIRES_SECONDS / 60);
  const subject = `${appName} sign-in code`;
  const text = [
    `Your ${appName} sign-in code is ${otp}.`,
    "",
    `It expires in ${minutes} minutes. If you did not request this, you can ignore this email.`,
  ].join("\n");
  const html = `<p>Your ${appName} sign-in code is</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>It expires in ${minutes} minutes. If you did not request this, you can ignore this email.</p>`;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Auth] OTP for ${email}: ${otp}`);
  }

  const resend = await resendHelper();
  const result = await resend.emails.send({
    from,
    to: email,
    subject,
    text,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message || "Resend rejected the login email.");
  }
}
