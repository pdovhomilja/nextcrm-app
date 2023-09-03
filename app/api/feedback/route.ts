import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  const body = await req.json();
  if (!body) {
    return new NextResponse("Missing body", { status: 400 });
  }
  const { feedback } = body;

  if (!feedback) {
    return new NextResponse("Missing feedback", { status: 400 });
  }

  try {
    //Send mail via Resend to info@softbase.cz
    await resend.emails.send({
      from:
        process.env.NEXT_PUBLIC_APP_NAME + " <" + process.env.EMAIL_FROM + ">",
      to: "info@softbase.cz",
      subject: "New Feedback from: " + process.env.NEXT_PUBLIC_APP_URL,
      text: feedback, // Add this line to fix the types issue
    });
    return NextResponse.json({ message: "Feedback sent" }, { status: 200 });
  } catch (error) {
    console.log("[FEEDBACK_POST]", error);
    return NextResponse.json({ error: "Initial error" }, { status: 500 });
  }
}
