import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components";

import { VENSAI_BRAND } from "@/lib/brand/vensai";
import { VensaiEmailShell } from "@/emails/components/VensaiEmailShell";

interface EmployeeWelcomeEmailProps {
  displayName: string;
  workEmail: string;
  personalEmail: string;
  temporaryPassword: string;
  invitedByName: string;
  appUrl: string;
  appName: string;
  mustChange?: boolean;
}

export function EmployeeWelcomeEmail({
  displayName,
  workEmail,
  personalEmail,
  temporaryPassword,
  invitedByName,
  appUrl,
  appName,
  mustChange = true,
}: EmployeeWelcomeEmailProps) {
  return (
    <VensaiEmailShell
      preview={`Your ${appName} account — sign in with your personal or work email`}
    >
      <Heading
        style={{
          margin: "0 0 16px",
          fontSize: 20,
          fontWeight: 600,
          color: VENSAI_BRAND.colors.navy,
          textAlign: "center" as const,
        }}
      >
        Welcome to {appName}
      </Heading>
      <Text style={{ fontSize: 14, lineHeight: "24px", color: VENSAI_BRAND.colors.text }}>
        Hi {displayName},
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "24px", color: VENSAI_BRAND.colors.text }}>
        {invitedByName} created your CRM account. Sign in with your personal email or company
        address <strong>{workEmail}</strong> using the {mustChange ? "temporary password" : "password"} below, or choose{" "}
        <strong>Email code</strong> on the login page for a one-time code.
      </Text>
      <Section
        style={{
          margin: "16px 0",
          borderRadius: 8,
          backgroundColor: VENSAI_BRAND.colors.canvas,
          padding: 16,
        }}
      >
        <Text style={{ margin: 0, fontSize: 11, textTransform: "uppercase", color: VENSAI_BRAND.colors.muted }}>
          Personal email
        </Text>
        <Text style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: VENSAI_BRAND.colors.navy }}>
          {personalEmail}
        </Text>
        <Text style={{ margin: "12px 0 0", fontSize: 11, textTransform: "uppercase", color: VENSAI_BRAND.colors.muted }}>
          Work email
        </Text>
        <Text style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: VENSAI_BRAND.colors.navy }}>
          {workEmail}
        </Text>
        <Text style={{ margin: "12px 0 0", fontSize: 11, textTransform: "uppercase", color: VENSAI_BRAND.colors.muted }}>
          {mustChange ? "Temporary password" : "Password"}
        </Text>
        <Text style={{ margin: "4px 0 0", fontFamily: "monospace", fontSize: 14, fontWeight: 600 }}>
          {temporaryPassword}
        </Text>
      </Section>
      {mustChange ? (
        <Text style={{ fontSize: 12, lineHeight: "20px", color: VENSAI_BRAND.colors.muted }}>
          After you sign in, you will be asked to choose a new password before using the CRM.
        </Text>
      ) : null}
      <Section style={{ margin: "24px 0", textAlign: "center" as const }}>
        <Button
          href={appUrl}
          style={{
            backgroundColor: VENSAI_BRAND.colors.primary,
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            padding: "12px 24px",
            textDecoration: "none",
          }}
        >
          Open {appName}
        </Button>
      </Section>
      <Text style={{ fontSize: 12, color: VENSAI_BRAND.colors.muted }}>
        Or visit{" "}
        <Link href={appUrl} style={{ color: VENSAI_BRAND.colors.primaryDark }}>
          {appUrl}
        </Link>{" "}
        and choose <strong>Sign in with password</strong>.
      </Text>
      <Hr style={{ borderColor: VENSAI_BRAND.colors.border, margin: "24px 0" }} />
      <Text style={{ fontSize: 11, color: VENSAI_BRAND.colors.muted }}>
        If you did not expect this email, contact {invitedByName} or ignore this message.
      </Text>
    </VensaiEmailShell>
  );
}

export default EmployeeWelcomeEmail;
