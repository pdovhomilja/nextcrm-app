import { Resend } from "resend";
import { VerificationEmail } from "@/emails/verification-email";
import {
  generateEmailVerificationToken,
  getVerificationUrl,
} from "./email-verification";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  email: string,
  name?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate verification token
    const token = await generateEmailVerificationToken(email);
    const verificationUrl = getVerificationUrl(token);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM!, // Replace with your verified domain
      to: [email],
      subject: "Verify your email address for TaskHQ",
      react: VerificationEmail({ name, verificationUrl }),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Verification email sent:", data);
    return { success: true };
  } catch (error) {
    console.error("Send verification email error:", error);
    return { success: false, error: "Failed to send verification email" };
  }
}
