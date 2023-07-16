import sendEmail from "@/lib/sendmail";
import { NextApiResponse } from "next";

export default async function handler(res: NextApiResponse) {
  try {
    const message: string = `Hi, Iam ${process.env.NEXT_PUBLIC_APP_NAME} API Bot which will send you some info if you want! I am running on ${process.env.NEXT_PUBLIC_APP_URL}`;

    await sendEmail({
      from: process.env.EMAIL_FROM,
      to: "info@softbase.cz",
      subject: `${process.env.NEXT_PUBLIC_APP_NAME} Cron`,
      text: message,
    });

    return res.status(200).end("Hello Cron!");
  } catch (error: any) {
    console.log(error);
    return res.status(500).end(error.message);
  }
}
