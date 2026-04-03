"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import InviteUserEmail from "@/emails/InviteUser";
import resendHelper from "@/lib/resend";
import { revalidatePath } from "next/cache";
import { Language } from "@prisma/client";

export const inviteUser = async (data: {
  name: string;
  email: string;
  language: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "admin") return { error: "Forbidden" };

  const { name, email, language } = data;

  if (!name || !email || !language) {
    return { error: "Name, Email, and Language is required!" };
  }

  let resend;
  try {
    resend = await resendHelper();
  } catch (error: any) {
    return { error: error?.message || "Resend API key is not configured" };
  }

  const checkexisting = await prismadb.users.findFirst({
    where: { email },
  });

  if (checkexisting) {
    return { error: "User already exists!" };
  }

  try {
    const user = await prismadb.users.create({
      data: {
        name,
        email,
        userStatus: "ACTIVE",
        userLanguage: language as Language,
        role: "member",
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        userLanguage: true,
        userStatus: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return { error: "User not created" };
    }

    await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: `You have been invited to ${process.env.NEXT_PUBLIC_APP_NAME}`,
      react: InviteUserEmail({
        invitedByUsername: session.user?.name || "admin",
        username: user.name!,
        userLanguage: language,
      }),
    });

    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[INVITE_USER]", error);
    return { error: "Failed to invite user" };
  }
};
