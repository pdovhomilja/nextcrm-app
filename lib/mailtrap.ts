import { MailtrapClient } from "mailtrap";
import { prismadb } from "./prisma";

export default async function mailtrapHelper() {
  const mailtrapKey = await prismadb.systemServices.findFirst({
    where: {
      name: "mailtrap_smtp",
    },
  });

  const apiKey = process.env.MAILTRAP_API_KEY || mailtrapKey?.serviceKey;

  if (!apiKey) {
    throw new Error(
      "Mailtrap API key is not configured. Please add it in Admin settings or set MAILTRAP_API_KEY environment variable."
    );
  }

  const client = new MailtrapClient({ token: apiKey });

  return client;
}

export async function sendMailtrapEmail({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const client = await mailtrapHelper();

  return client.send({
    from: { email: from },
    to: [{ email: to }],
    subject,
    html,
  });
}
