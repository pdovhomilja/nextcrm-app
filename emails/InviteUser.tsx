import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";

import { getProductName, VENSAI_BRAND } from "@/lib/brand/vensai";
import { VensaiEmailShell } from "@/emails/components/VensaiEmailShell";

interface VercelInviteUserEmailProps {
  username: string;
  invitedByUsername: string;
  userLanguage: string;
}

export const InviteUserEmail = ({
  username,
  invitedByUsername,
  userLanguage,
}: VercelInviteUserEmailProps) => {
  const appName = getProductName();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const previewText =
    userLanguage === "en"
      ? `You have been invited by ${invitedByUsername} to ${appName}`
      : `Byl jste pozván uživatelem ${invitedByUsername} do aplikace ${appName}`;

  return (
    <VensaiEmailShell preview={previewText}>
      <Heading
        style={{
          margin: "0 0 20px",
          fontSize: 22,
          fontWeight: 600,
          color: VENSAI_BRAND.colors.navy,
          textAlign: "center" as const,
        }}
      >
        {userLanguage === "en"
          ? "You have been invited to cooperate on something special"
          : "Byl(a) jste pozván(a) ke spolupráci na něčem úžasném"}
      </Heading>
      <Text style={{ fontSize: 14, lineHeight: "24px", color: VENSAI_BRAND.colors.text }}>
        {userLanguage === "en" ? `Hello ${username},` : `Dobrý den ${username},`}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "24px", color: VENSAI_BRAND.colors.text }}>
        <strong>{invitedByUsername}</strong>
        {userLanguage === "en" ? ` has invited you to the ` : ` Vás pozval ke spolupráci na `}
        <strong>{appName}</strong> app: <strong>{appUrl}</strong>.
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "24px", color: VENSAI_BRAND.colors.text }}>
        {userLanguage === "en"
          ? `To accept this invitation, click the button below and sign in with your email address.`
          : `Pro přijetí této pozvánky klikněte na tlačítko níže a přihlaste se pomocí své e-mailové adresy.`}
      </Text>
      <Section style={{ margin: "32px 0", textAlign: "center" as const }}>
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
          {userLanguage === "en" ? "Join the team" : "Připojit se"}
        </Button>
      </Section>
      <Text style={{ fontSize: 14, lineHeight: "24px", color: VENSAI_BRAND.colors.text }}>
        {userLanguage === "en" ? "Or copy and paste this URL into your browser:" : "Nebo zkopírujte a vložte tento odkaz do svého prohlížeče:"}{" "}
        <Link href={appUrl} style={{ color: VENSAI_BRAND.colors.primaryDark }}>
          {appUrl}
        </Link>
      </Text>
      <Hr style={{ borderColor: VENSAI_BRAND.colors.border, margin: "26px 0" }} />
      <Text style={{ fontSize: 11, lineHeight: "18px", color: VENSAI_BRAND.colors.muted }}>
        {userLanguage === "en" ? `This invitation was intended for ` : `Toto pozvání bylo určeno pro `}
        <span style={{ color: VENSAI_BRAND.colors.text }}>{username}. </span>
        {userLanguage === "en"
          ? "If you were not expecting this invitation, you can ignore this email."
          : "Pokud jste toto pozvání neočekávali, můžete tento e-mail ignorovat."}
      </Text>
    </VensaiEmailShell>
  );
};

export default InviteUserEmail;
