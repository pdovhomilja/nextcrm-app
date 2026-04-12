"use server";
import { getSession } from "@/lib/auth-server";
import resendHelper from "@/lib/resend";

export async function sendFeedback(data: { feedback: string }) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { feedback } = data;
  if (!feedback) return { error: "Missing feedback" };

  let resend;
  try {
    resend = await resendHelper();
  } catch (error: any) {
    return { error: error?.message || "Resend API key is not configured" };
  }

  try {
    await resend.emails.send({
      from:
        process.env.NEXT_PUBLIC_APP_NAME + " <" + process.env.EMAIL_FROM + ">",
      to: "info@softbase.cz",
      subject: "New Feedback from: " + process.env.NEXT_PUBLIC_APP_URL,
      text: feedback,
    });
    return { success: true };
  } catch (error) {
    console.log("[FEEDBACK_SEND]", error);
    return { error: "Failed to send feedback" };
  }
}
