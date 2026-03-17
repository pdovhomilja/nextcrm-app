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

    console.log("[USERS_POST] Registration attempt:", {
      name: name ? "provided" : "missing",
      username: username ? "provided" : "missing",
      email: email ? "provided" : "missing",
      language: language ? `provided (${language})` : "missing",
      password: password ? "provided" : "missing",
      confirmPassword: confirmPassword ? "provided" : "missing",
    });

    if (!name || !email || !language || !password || !confirmPassword) {
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!email) missingFields.push("email");
      if (!language) missingFields.push("language");
      if (!password) missingFields.push("password");
      if (!confirmPassword) missingFields.push("confirmPassword");

      console.log("[USERS_POST] Missing required fields:", missingFields);
      return new NextResponse(`Missing required fields: ${missingFields.join(", ")}`, { status: 400 });
    }

    if (password !== confirmPassword) {
      console.log("[USERS_POST] Password mismatch");
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    const checkexisting = await prismadb.users.findFirst({
      where: {
        email: email,
      },
    });

    if (checkexisting) {
      console.log("[USERS_POST] User already exists with email:", email);
      return new NextResponse("User already exists", { status: 409 });
    }

    /*
    Check if user is first user in the system. If yes, then create user with admin rights. If not, then create user with no admin rights.
    */

    const isFirstUser = await prismadb.users.findMany({});
    console.log("[USERS_POST] Existing users count:", isFirstUser.length);

    if (isFirstUser.length === 0) {
      console.log("[USERS_POST] Creating first user (admin)...");
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
      console.log("[USERS_POST] First user created successfully:", user.id);
      return NextResponse.json(user);
    } else {
      console.log("[USERS_POST] Creating regular user...");
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
      console.log("[USERS_POST] User created successfully:", user.id, "Status:", user.userStatus);

      /*
      Function will send email to all admins about new user registration which is in PENDING state and need to be activated
    */
      newUserNotify(user);

      return NextResponse.json(user);
    }
  } catch (error) {
    console.error("[USERS_POST] Error creating user:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Registration failed: ${errorMessage}`, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search") ?? "";
    const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10));
    const take = Math.min(100, Math.max(1, parseInt(searchParams.get("take") ?? "50", 10)));

    const userSelect = { id: true, name: true, avatar: true } as const;

    if (id) {
      const user = await prismadb.users.findFirst({
        where: { id, userStatus: "ACTIVE" },
        select: userSelect,
      });
      if (!user) return new NextResponse("Not found", { status: 404 });
      return NextResponse.json(user);
    }

    const where = {
      userStatus: "ACTIVE" as const,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [users, total] = await prismadb.$transaction([
      prismadb.users.findMany({
        where,
        select: userSelect,
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      prismadb.users.count({ where }),
    ]);

    return NextResponse.json({ users, total, hasMore: skip + take < total });
  } catch (error) {
    console.log("[USERS_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
