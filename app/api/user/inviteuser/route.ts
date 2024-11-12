import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateRandomPassword } from "@/lib/utils";

import { hash } from "bcryptjs";

import InviteUserEmail from "@/emails/InviteUser";
import resendHelper from "@/lib/resend";

export async function POST(req: Request) {
  /*
  Resend.com function init - this is a helper function that will be used to send emails
  */
  const resend = await resendHelper();
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, language } = body;

    if (!name || !email || !language) {
      return NextResponse.json(
        { error: "Name, Email, and Language is required!" },
        {
          status: 200,
        }
      );
    }

    const password = generateRandomPassword();

    let message = "";

    switch (language) {
      case "en":
        message = `You have been invited to ${process.env.NEXT_PUBLIC_APP_NAME} \n\n Your username is: ${email} \n\n Your password is: ${password} \n\n Please login to ${process.env.NEXT_PUBLIC_APP_URL} \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
      case "cz":
        message = `Byl jste pozván do ${process.env.NEXT_PUBLIC_APP_NAME} \n\n Vaše uživatelské jméno je: ${email} \n\n Vaše heslo je: ${password} \n\n Prosím přihlašte se na ${process.env.NEXT_PUBLIC_APP_URL} \n\n Děkujeme \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
      default:
        message = `You have been invited to ${process.env.NEXT_PUBLIC_APP_NAME} \n\n Your username is: ${email} \n\n Your password is: ${password} \n\n Please login to ${process.env.NEXT_PUBLIC_APP_URL} \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
    }

    //Check if user already exists in local database
    const checkexisting = await prismadb.users.findFirst({
      where: {
        email: email,
      },
    });
    //console.log(checkexisting, "checkexisting");

    //If user already exists, return error else create user and send email
    if (checkexisting) {
      return NextResponse.json(
        { error: "User already exist, reset password instead!" },
        {
          status: 200,
        }
      );
    } else {
      try {
        const user = await prismadb.users.create({
          data: {
            name,
            username: "",
            avatar: "",
            account_name: "",
            is_account_admin: false,
            is_admin: false,
            email,
            userStatus: "ACTIVE",
            userLanguage: language,
            password: await hash(password, 12),
          },
        });

        if (!user) {
          return new NextResponse("User not created", { status: 500 });
        }

        const data = await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: user.email,
          subject: `You have been invited to ${process.env.NEXT_PUBLIC_APP_NAME} `,
          text: message, // Add this line to fix the types issue
          react: InviteUserEmail({
            invitedByUsername: session.user?.name! || "admin",
            username: user?.name!,
            invitedUserPassword: password,
            userLanguage: language,
          }),
        });

        console.log(data, "data");

        return NextResponse.json(user, { status: 200 });
      } catch (err) {
        console.log(err);
      }
    }
  } catch (error) {
    console.log("[USERACTIVATE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
