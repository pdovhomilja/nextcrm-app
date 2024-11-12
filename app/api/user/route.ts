import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";
import { newUserNotify } from "@/lib/new-user-notify";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, username, email, language, password, confirmPassword } = body;

    if (!name || !email || !language || !password || !confirmPassword) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (password !== confirmPassword) {
      return new NextResponse("Password does not match", { status: 401 });
    }

    const checkexisting = await prismadb.users.findFirst({
      where: {
        email: email,
      },
    });

    if (checkexisting) {
      return new NextResponse("User already exist", { status: 401 });
    }

    /*
    Check if user is first user in the system. If yes, then create user with admin rights. If not, then create user with no admin rights.
    */

    const isFirstUser = await prismadb.users.findMany({});
    if (isFirstUser.length === 0) {
      //There is no user in the system, so create user with admin rights and set userStatus to ACTIVE
      const user = await prismadb.users.create({
        data: {
          name,
          username,
          avatar: "",
          account_name: "",
          is_account_admin: false,
          is_admin: true,
          email,
          userLanguage: language,
          userStatus: "ACTIVE",
          password: await hash(password, 12),
        },
      });
      return NextResponse.json(user);
    } else {
      //There is at least one user in the system, so create user with no admin rights and set userStatus to PENDING
      const user = await prismadb.users.create({
        data: {
          name,
          username,
          avatar: "",
          account_name: "",
          is_account_admin: false,
          is_admin: false,
          email,
          userLanguage: language,
          userStatus:
            process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io"
              ? "ACTIVE"
              : "PENDING",
          password: await hash(password, 12),
        },
      });

      /*
      Function will send email to all admins about new user registration which is in PENDING state and need to be activated
    */
      newUserNotify(user);

      return NextResponse.json(user);
    }
  } catch (error) {
    console.log("[USERS_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const users = await prismadb.users.findMany({});

    return NextResponse.json(users);
  } catch (error) {
    console.log("[USERS_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
