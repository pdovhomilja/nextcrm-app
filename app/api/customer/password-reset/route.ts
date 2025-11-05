import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { hash } from "bcrypt";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new NextResponse("Email is required", { status: 400 });
    }

    const customer = await prismadb.customer_portal_users.findFirst({
      where: {
        email,
      },
    });

    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 });
    }

    const newPassword = randomBytes(8).toString("hex");
    const hashedPassword = await hash(newPassword, 12);

    await prismadb.customer_portal_users.update({
      where: {
        id: customer.id,
      },
      data: {
        password_hash: hashedPassword,
      },
    });

    await sendPasswordResetEmail(email, newPassword);

    return new NextResponse("Password reset email sent", { status: 200 });
  } catch (error) {
    console.log("[CUSTOMER_PASSWORD_RESET_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
