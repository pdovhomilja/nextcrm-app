import resendHelper from "@/lib/resend";

export type ResendSendPayload = {
  fromEmail: string;
  fromName?: string | null;
  label?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
};

export function formatResendFromAddress(payload: {
  fromEmail: string;
  fromName?: string | null;
  label?: string;
}): string {
  const envFrom = process.env.RESEND_FROM_EMAIL?.trim();
  const email =
    payload.fromEmail.includes("@") ? payload.fromEmail.trim() : envFrom ?? "";
  if (!email) {
    throw new Error(
      "From address is required. Set the mailbox email or RESEND_FROM_EMAIL in your environment."
    );
  }
  const display = payload.fromName?.trim() || payload.label?.trim();
  return display ? `${display} <${email}>` : email;
}

export async function sendMailViaResend(payload: ResendSendPayload) {
  const resend = await resendHelper();
  const from = formatResendFromAddress({
    fromEmail: payload.fromEmail,
    fromName: payload.fromName,
    label: payload.label,
  });

  const headers: Record<string, string> = {};
  if (payload.inReplyTo) headers["In-Reply-To"] = payload.inReplyTo;
  if (payload.references) headers["References"] = payload.references;

  const result = await resend.emails.send({
    from,
    to: payload.to,
    cc: payload.cc?.length ? payload.cc : undefined,
    bcc: payload.bcc?.length ? payload.bcc : undefined,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo: payload.replyTo,
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Resend failed to send email");
  }

  return result.data;
}
