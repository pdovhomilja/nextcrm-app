import { DemoTemplate } from "@/emails/DemoTemplate";
import InviteUserEmail from "@/emails/InvitationTemplate";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    const data = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["pavel@dovhomilja.cz"],
      subject: "Hello world",
      text: "", // Add this line to fix the types issue
      //react: DemoTemplate({ firstName: "John" }),
      react: InviteUserEmail({}),
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error });
  }
}
