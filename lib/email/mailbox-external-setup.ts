import { EmailSendProvider } from "@prisma/client";

/** Resend relay (same org API key as CRM). https://resend.com/docs/send-with-smtp */
export const RESEND_SMTP = {
  host: "smtp.resend.com",
  portTls: 465,
  portStartTls: 587,
  username: "resend",
} as const;

export type MailboxExternalSetupPublic = {
  accountId: string;
  label: string;
  fromEmail: string;
  fromName: string | null;
  provider: EmailSendProvider;
  outbound: {
    host: string;
    port: number;
    encryption: "SSL/TLS" | "STARTTLS";
    username: string;
    /** Login email for SMTP AUTH when provider is Resend (must match verified domain). */
    authEmail: string;
  };
  inbound: {
    supported: boolean;
    imapHost?: string;
    imapPort?: number;
    imapSsl?: boolean;
    note: string;
  };
};

export function buildMailboxExternalSetupPublic(input: {
  id: string;
  label: string;
  username: string;
  fromName: string | null;
  sendProvider: EmailSendProvider;
  smtpHost: string;
  smtpPort: number;
  smtpSsl: boolean;
  imapHost: string;
  imapPort: number;
  imapSsl: boolean;
}): MailboxExternalSetupPublic {
  const fromEmail = input.username.trim();

  if (input.sendProvider === EmailSendProvider.RESEND) {
    return {
      accountId: input.id,
      label: input.label,
      fromEmail,
      fromName: input.fromName,
      provider: EmailSendProvider.RESEND,
      outbound: {
        host: RESEND_SMTP.host,
        port: RESEND_SMTP.portTls,
        encryption: "SSL/TLS",
        username: RESEND_SMTP.username,
        authEmail: fromEmail,
      },
      inbound: {
        supported: false,
        note:
          "Inbound mail for this address is delivered to VenSai CRM via Resend (not IMAP). Use the E-mails section in CRM for inbox, or configure a separate mail host if you need IMAP elsewhere.",
      },
    };
  }

  return {
    accountId: input.id,
    label: input.label,
    fromEmail,
    fromName: input.fromName,
    provider: EmailSendProvider.SMTP,
    outbound: {
      host: input.smtpHost,
      port: input.smtpPort,
      encryption: input.smtpSsl ? "SSL/TLS" : "STARTTLS",
      username: fromEmail,
      authEmail: fromEmail,
    },
    inbound: {
      supported: input.imapHost !== "resend.send-only",
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapSsl: input.imapSsl,
      note: "Use the IMAP settings below in Outlook, Apple Mail, or Thunderbird to sync the same mailbox.",
    },
  };
}
