"use server";
import { prismadb } from "@/lib/prisma";
import { generateRandomPassword } from "@/lib/utils";
import { hash } from "bcryptjs";
import PasswordResetEmail from "@/emails/PasswordReset";
import resendHelper from "@/lib/resend";

export const passwordReset = async (email: string) => {
  if (!email) {
    return { error: "Email is required!" };
  }

  let resend;
  try {
    resend = await resendHelper();
  } catch (error: any) {
    return { error: error?.message || "Resend API key is not configured" };
  }

  const user = await prismadb.users.findFirst({
    where: { email },
  });

  if (!user) {
    return { error: "No user with that Email exist in Db!" };
  }

  try {
    const password = generateRandomPassword();

    const newpassword = await prismadb.users.update({
      where: { id: user.id },
      data: { password: await hash(password, 12) },
    });

    if (!newpassword) {
      return { error: "Password not updated!" };
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: user.email,
      subject: "NextCRM - Password reset",
      text: "",
      react: PasswordResetEmail({
        username: user?.name!,
        avatar: user.avatar,
        email: user.email,
        password: password,
        userLanguage: user.userLanguage,
      }),
    });

    console.log("Email sent to: " + user.email);
    return { success: true, message: "Password changed!" };
  } catch (error) {
    console.log("[PASSWORD_RESET]", error);
    return { error: "Failed to reset password" };
  }
};
