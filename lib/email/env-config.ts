import { getResendInboundWebhookUrl } from "@/lib/email/resend-inbound";
import { getOrgEmailDomain } from "@/lib/org-work-email";

export type EmailEnvCheck = {
  key: string;
  label: string;
  configured: boolean;
  required: boolean;
};

/** Read-only checklist — secrets live in Vercel / .env only (not Admin UI). */
export function getEmailEnvironmentStatus(): {
  checks: EmailEnvCheck[];
  webhookUrl: string;
  orgDomain: string;
  readyForSend: boolean;
  readyForReceive: boolean;
} {
  const checks: EmailEnvCheck[] = [
    {
      key: "RESEND_API_KEY",
      label: "Resend API key (send + fetch inbound)",
      configured: Boolean(process.env.RESEND_API_KEY?.trim()),
      required: true,
    },
    {
      key: "RESEND_FROM_EMAIL",
      label: "Default from address (verified domain)",
      configured: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
      required: true,
    },
    {
      key: "EMAIL_FROM",
      label: "System emails (passwords, invites)",
      configured: Boolean(process.env.EMAIL_FROM?.trim()),
      required: true,
    },
    {
      key: "ORG_EMAIL_DOMAIN",
      label: "Employee work email domain",
      configured: Boolean(
        process.env.ORG_EMAIL_DOMAIN?.trim() || process.env.RESEND_FROM_EMAIL?.includes("@")
      ),
      required: true,
    },
    {
      key: "RESEND_INBOUND_WEBHOOK_SECRET",
      label: "Resend inbound webhook signing secret (whsec_…)",
      configured: Boolean(
        process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim() ||
          process.env.RESEND_WEBHOOK_SECRET?.trim()
      ),
      required: true,
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "Public CRM URL (webhook + links)",
      configured: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
      required: true,
    },
    {
      key: "INNGEST_EVENT_KEY",
      label: "Inngest event key",
      configured: Boolean(process.env.INNGEST_EVENT_KEY?.trim()),
      required: true,
    },
    {
      key: "INNGEST_SIGNING_KEY",
      label: "Inngest signing key",
      configured: Boolean(process.env.INNGEST_SIGNING_KEY?.trim()),
      required: true,
    },
  ];

  const readyForSend =
    checks.find((c) => c.key === "RESEND_API_KEY")!.configured &&
    checks.find((c) => c.key === "RESEND_FROM_EMAIL")!.configured;

  const readyForReceive =
    readyForSend &&
    checks.find((c) => c.key === "RESEND_INBOUND_WEBHOOK_SECRET")!.configured &&
    checks.find((c) => c.key === "INNGEST_EVENT_KEY")!.configured &&
    checks.find((c) => c.key === "INNGEST_SIGNING_KEY")!.configured;

  return {
    checks,
    webhookUrl: getResendInboundWebhookUrl(),
    orgDomain: getOrgEmailDomain(),
    readyForSend,
    readyForReceive,
  };
}
