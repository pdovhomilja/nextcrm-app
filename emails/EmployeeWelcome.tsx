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

interface EmployeeWelcomeEmailProps {
  displayName: string;
  workEmail: string;
  personalEmail: string;
  temporaryPassword: string;
  invitedByName: string;
  appUrl: string;
  appName: string;
}

export function EmployeeWelcomeEmail({
  displayName,
  workEmail,
  personalEmail,
  temporaryPassword,
  invitedByName,
  appUrl,
  appName,
}: EmployeeWelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {appName} account — sign in with your personal or work email</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-[480px] rounded-md border border-solid border-slate-200 p-[24px]">
            <Heading className="mx-0 my-[16px] p-0 text-center text-xl font-semibold text-black">
              Welcome to {appName}
            </Heading>
            <Text className="text-sm leading-6 text-black">Hi {displayName},</Text>
            <Text className="text-sm leading-6 text-black">
              {invitedByName} created your CRM account. Sign in with your personal email or
              your company address <strong>{workEmail}</strong>. Both use the same password.
            </Text>
            <Section className="my-4 rounded-md bg-slate-50 px-4 py-3">
              <Text className="m-0 text-xs uppercase tracking-wide text-slate-500">
                Personal email
              </Text>
              <Text className="m-0 mt-1 text-sm font-medium text-black">{personalEmail}</Text>
              <Text className="mb-0 mt-3 text-xs uppercase tracking-wide text-slate-500">
                Work email
              </Text>
              <Text className="m-0 mt-1 text-sm font-medium text-black">{workEmail}</Text>
              <Text className="mb-0 mt-3 text-xs uppercase tracking-wide text-slate-500">
                Temporary password
              </Text>
              <Text className="m-0 mt-1 font-mono text-sm font-semibold text-black">
                {temporaryPassword}
              </Text>
            </Section>
            <Text className="text-xs leading-5 text-slate-600">
              Change this password after your first login. Your admin can reset it anytime from Admin
              → Users.
            </Text>
            <Section className="my-6 text-center">
              <Button
                className="rounded-md bg-slate-900 px-5 py-3 text-center text-xs font-semibold text-white no-underline"
                href={appUrl}
              >
                Open {appName}
              </Button>
            </Section>
            <Text className="text-xs text-slate-500">
              Or visit{" "}
              <Link href={appUrl} className="text-blue-600">
                {appUrl}
              </Link>{" "}
              and choose <strong>Sign in with password</strong>.
            </Text>
            <Hr className="my-6 border-slate-200" />
            <Text className="text-xs text-slate-500">
              If you did not expect this email, contact {invitedByName} or ignore this message.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default EmployeeWelcomeEmail;
