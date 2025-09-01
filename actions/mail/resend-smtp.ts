"use server";

import db from "@/lib/db";
import resendHelper from "@/lib/resend";

export async function sendMailWithResend(
  accountId: string,
  to: string,
  subject: string,
  body: string
) {
  const resend = await resendHelper();
  const userMailAccount = await db.userMailAccount.findUnique({
    where: { id: accountId },
  });
  if (!userMailAccount) {
    return { success: false, error: "Mail account not found" };
  }
  const result = await resend.emails.send({
    from: userMailAccount.email,
    to: [to],
    subject: subject,
    text: body,
  });
  console.log("Send email result:", result);
  if (result.data) {
    return { success: true };
  } else {
    return { success: false, error: "Failed to send email" };
  }
}
