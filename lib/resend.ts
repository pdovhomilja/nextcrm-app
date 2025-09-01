import { Resend } from "resend";

export default async function resendHelper() {
  const resend = new Resend(process.env.RESEND_API_KEY as string);
  return resend;
}
