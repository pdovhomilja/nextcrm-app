import { Resend } from "resend";
import { prismadb } from "./prisma";
import { envSecret } from "./env-secret";

export default async function resendHelper() {
  const resendKey = await prismadb.systemServices.findFirst({
    where: {
      name: "resend_smtp",
    },
  });

  const apiKey = envSecret("RESEND_API_KEY") || resendKey?.serviceKey;

  if (!apiKey) {
    throw new Error("Resend API key is not configured. Please add it in Admin settings or set RESEND_API_KEY environment variable.");
  }

  const resend = new Resend(apiKey);

  return resend;
}
