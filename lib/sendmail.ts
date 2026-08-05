import nodemailer from "nodemailer";

interface EmailOptions {
  from: string | undefined;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export default async function sendEmail(
  emailOptions: EmailOptions
): Promise<void> {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : process.env.EMAIL_SECURE !== undefined
        ? process.env.EMAIL_SECURE === "true"
        : port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USERNAME;
  const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user || pass ? { user, pass } : undefined,
  });

  try {
    await transporter.sendMail(emailOptions);
    console.log(`Email sent to ${emailOptions.to}`);
  } catch (error: any | Error) {
    console.error(`Error occurred while sending email: ${error.message}`);
  }
}
