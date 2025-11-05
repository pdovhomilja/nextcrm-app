import * as nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, newPassword: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Your new password",
    html: `<p>Your new password is: ${newPassword}</p>`,
  };

  await transporter.sendMail(mailOptions);
}
