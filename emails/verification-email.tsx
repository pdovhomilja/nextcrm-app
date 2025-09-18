import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VerificationEmailProps {
  name?: string;
  verificationUrl: string;
}

export const VerificationEmail = ({
  name,
  verificationUrl,
}: VerificationEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address for TaskHQ</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to TaskHQ!</Heading>

        <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>

        <Text style={text}>
          Thank you for signing up for TaskHQ. To complete your registration and
          access your dashboard, please verify your email address by clicking
          the button below.
        </Text>

        <Button style={button} href={verificationUrl}>
          Verify Email Address
        </Button>

        <Text style={text}>Or copy and paste this URL into your browser:</Text>

        <Link href={verificationUrl} style={link}>
          {verificationUrl}
        </Link>

        <Text style={text}>
          This verification link will expire in 24 hours. If you didn't create
          an account with TaskHQ, you can safely ignore this email.
        </Text>

        <Text style={footer}>
          Best regards,
          <br />
          The TaskHQ Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default VerificationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 8px 8px 8px",
  textAlign: "left" as const,
};

const button = {
  backgroundColor: "#007ee6",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "200px",
  padding: "14px 7px",
  margin: "32px auto",
};

const link = {
  color: "#007ee6",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
  margin: "8px",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "32px 8px 0 8px",
};
