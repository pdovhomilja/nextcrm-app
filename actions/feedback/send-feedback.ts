"use server";
import { getSession } from "@/lib/auth-server";
import resendHelper from "@/lib/resend";
import { prismadb } from "@/lib/prisma";

export async function sendFeedback(data: { feedback: string }) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { feedback } = data;
  if (!feedback) return { error: "Missing feedback" };

  const admins = await prismadb.users.findMany({
    where: { role: "admin", userStatus: "ACTIVE" },
    select: { email: true },
  });
  const recipients = admins.map((a) => a.email).filter(Boolean);
  if (recipients.length === 0)
    return { error: "No active admin to receive feedback" };

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
      to: recipients,
      subject: "New Feedback from: " + process.env.NEXT_PUBLIC_APP_URL,
      text: feedback,
    });
    return { success: true };
  } catch (error) {
    console.log("[FEEDBACK_SEND]", error);
    return { error: "Failed to send feedback" };
  }
}
