"use server";
import { prismadb } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { newUserNotify } from "@/lib/new-user-notify";
import { Language } from "@prisma/client";

export const registerUser = async (data: {
  name: string;
  username: string;
  email: string;
  language: string;
  password: string;
  confirmPassword: string;
}) => {
  const { name, username, email, language, password, confirmPassword } = data;

  if (!name || !email || !language || !password || !confirmPassword) {
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!email) missingFields.push("email");
    if (!language) missingFields.push("language");
    if (!password) missingFields.push("password");
    if (!confirmPassword) missingFields.push("confirmPassword");
    return { error: `Missing required fields: ${missingFields.join(", ")}` };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const checkexisting = await prismadb.users.findFirst({
    where: { email },
  });

  if (checkexisting) {
    return { error: "User already exists" };
  }

  try {
    const isFirstUser = await prismadb.users.findMany({});

    if (isFirstUser.length === 0) {
      // First user gets admin rights and ACTIVE status
      const user = await prismadb.users.create({
        data: {
          name,
          username,
          avatar: "",
          account_name: "",
          is_account_admin: false,
          is_admin: true,
          email,
          userLanguage: language as Language,
          userStatus: "ACTIVE",
          password: await hash(password, 12),
        },
      });
      return { data: user };
    } else {
      // Subsequent users get PENDING status (unless demo env)
      const user = await prismadb.users.create({
        data: {
          name,
          username,
          avatar: "",
          account_name: "",
          is_account_admin: false,
          is_admin: false,
          email,
          userLanguage: language as Language,
          userStatus:
            process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io"
              ? "ACTIVE"
              : "PENDING",
          password: await hash(password, 12),
        },
      });

      // Notify admins about the new pending user
      newUserNotify(user);

      return { data: user };
    }
  } catch (error) {
    console.error("[REGISTER_USER]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: `Registration failed: ${errorMessage}` };
  }
};
