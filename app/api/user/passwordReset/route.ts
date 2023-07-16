import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateRandomPassword } from "@/lib/utils";
import sendEmail from "@/lib/sendmail";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    console.log(body, "body");
    console.log(email, "email");

    if (!email) {
      return new NextResponse("Email is required!", {
        status: 401,
      });
    }

    const password = generateRandomPassword();

    const user = await prismadb.users.findFirst({
      where: {
        email: email,
      },
    });

    if (!user) {
      return new NextResponse("No user with that Email exist in Db!", {
        status: 401,
      });
    }

    const newpassword = await prismadb.users.update({
      where: { id: user.id },
      data: {
        password: await hash(password, 12),
      },
    });

    if (!newpassword) {
      return new NextResponse("Password not updated!", {
        status: 401,
      });
    } else {
      let message = "";

      switch (user.userLanguage) {
        case "en":
          message = `Your password was reset,\n\n Your username: ${email}, now has password: ${password} \n\n Please login to ${process.env.NEXT_PUBLIC_APP_URL} \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
          break;
        case "cz":
          message = `Vaše heslo bylo resetováno,\n\n Vaše uživatelské jméno: ${email}, má nyní heslo: \n\n  ${password} \n\n Prosíme přihlašte se na ${process.env.NEXT_PUBLIC_APP_URL} \n\n Děkujeme \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
          break;
        default:
          message = `Vaše heslo bylo resetováno,\n\n Vaše uživatelské jméno: ${email}, má nyní heslo: \n\n  ${password} \n\n Prosíme přihlašte se na ${process.env.NEXT_PUBLIC_APP_URL} \n\n Děkujeme \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
          break;
      }

      await sendEmail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Password reset from ${process.env.NEXT_PUBLIC_APP_NAME}`,
        text: message,
      });
    }

    return NextResponse.json({ message: "Password changed!", status: true });
  } catch (error) {
    console.log("[USER_PASSWORD_CHANGE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
