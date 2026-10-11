import { Resend } from "resend";

export async function getResendApiKey(): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it in Vercel Environment Variables or .env.local."
    );
  }

  return apiKey;
}

export default async function resendHelper() {
  return new Resend(await getResendApiKey());
}
