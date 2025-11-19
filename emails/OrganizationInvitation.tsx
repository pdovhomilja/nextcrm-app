import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";
import { getRoleDisplayName } from "@/lib/permissions";
import { OrganizationRole } from "@prisma/client";

interface OrganizationInvitationEmailProps {
  organizationName: string;
  invitedByName: string;
  inviteeEmail: string;
  role: OrganizationRole;
  invitationLink: string;
  userLanguage?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

export const OrganizationInvitationEmail = ({
  organizationName,
  invitedByName,
  inviteeEmail,
  role,
  invitationLink,
  userLanguage = "en",
}: OrganizationInvitationEmailProps) => {
  const roleDisplayName = getRoleDisplayName(role);

  const content = {
    en: {
      previewText: `You've been invited to join ${organizationName}`,
      heading: "You've been invited to collaborate",
      greeting: "Hello,",
      invitationMessage: (byName: string, orgName: string, roleName: string) =>
        `${byName} has invited you to join ${orgName} as a ${roleName}.`,
      roleDescription: (roleName: string) => `Role: ${roleName}`,
      actionButton: "Accept Invitation",
      copyPasteText: "or copy and paste this URL into your browser:",
      expiryInfo: "This invitation will expire in 7 days.",
      footer: (email: string) =>
        `This invitation was intended for ${email}. If you were not expecting this invitation, you can ignore this email.`,
    },
    cz: {
      previewText: `Byli jste pozváni ke spolupráci v organizaci ${organizationName}`,
      heading: "Byli jste pozváni ke spolupráci",
      greeting: "Dobrý den,",
      invitationMessage: (byName: string, orgName: string, roleName: string) =>
        `${byName} vás pozval(a) ke spolupráci na ${orgName} s rolí ${roleName}.`,
      roleDescription: (roleName: string) => `Role: ${roleName}`,
      actionButton: "Přijmout pozvání",
      copyPasteText: "nebo zkopírujte a vložte tento odkaz do svého prohlížeče:",
      expiryInfo: "Toto pozvání vyprší za 7 dní.",
      footer: (email: string) =>
        `Toto pozvání bylo určeno pro ${email}. Pokud jste toto pozvání neočekávali, můžete tento e-mail ignorovat.`,
    },
  };

  const locale = userLanguage === "cz" ? "cz" : "en";
  const messages = content[locale as keyof typeof content];

  return (
    <Html>
      <Head />
      <Preview>{messages.previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-300 rounded-md my-[40px] mx-auto p-[20px] w-[465px]">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {messages.heading}
            </Heading>

            <Text className="text-black text-[14px] leading-[24px]">
              {messages.greeting}
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
              <strong>{invitedByName}</strong>{" "}
              {messages.invitationMessage(
                invitedByName,
                organizationName,
                roleDisplayName
              )}
            </Text>

            <Text className="text-black text-[14px] leading-[24px] bg-slate-50 p-3 rounded">
              {messages.roleDescription(roleDisplayName)}
            </Text>

            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-slate-800 rounded-md text-white py-3 px-4 text-[12px] font-semibold no-underline text-center"
                href={invitationLink}
              >
                {messages.actionButton}
              </Button>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              {messages.copyPasteText}
            </Text>

            <Text className="text-blue-600 text-[12px] break-all">
              <Link href={invitationLink} className="text-blue-600 no-underline">
                {invitationLink}
              </Link>
            </Text>

            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />

            <Text className="text-slate-500 text-[12px] leading-[24px]">
              {messages.expiryInfo}
            </Text>

            <Text className="text-slate-500 text-muted-foreground text-[12px] leading-[24px]">
              {messages.footer(inviteeEmail)}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OrganizationInvitationEmail;
