import { Resend } from "resend";
import { prismadb } from "./prisma";
import { redirectRecipients } from "./email/redirect";

export default async function resendHelper() {
  const resendKey = await prismadb.systemServices.findFirst({
    where: {
      name: "resend_smtp",
    },
  });

  const apiKey = process.env.RESEND_API_KEY || resendKey?.serviceKey;

  if (!apiKey) {
    throw new Error("Resend API key is not configured. Please add it in Admin settings or set RESEND_API_KEY environment variable.");
  }

  const resend = new Resend(apiKey);

  // Central non-prod safety: rewrite recipients to EMAIL_REDIRECT_TO in dev/QA so no
  // transactional send (OTP, invites, invoices, notifications) reaches a real inbox.
  // No-op in production and when EMAIL_REDIRECT_TO is unset. See lib/email/redirect.ts.
  const send = resend.emails.send.bind(resend.emails);
  resend.emails.send = ((payload: Parameters<typeof send>[0], options?: Parameters<typeof send>[1]) =>
    send({ ...payload, to: redirectRecipients(payload.to) }, options)) as typeof resend.emails.send;

  return resend;
}
