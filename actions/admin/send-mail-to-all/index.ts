"use server";
import { render } from "@react-email/render";

import { SendMailToAll } from "./schema";
import { InputType, ReturnType } from "./types";

import { prismadb } from "@/lib/prisma";
import resendHelper, { getResendApiKey } from "@/lib/resend";
import { createSafeAction } from "@/lib/create-safe-action";
import MessageToAllUsers from "@/emails/admin/MessageToAllUser";
import sendEmail from "@/lib/sendmail";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

const handler = async (data: InputType): Promise<ReturnType> => {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) {
      return { error: "You must be authenticated." };
    }
    if (e instanceof AuthorizationError) {
      return { error: "You are not authorized to perform this action." };
    }
    throw e;
  }

  const { title, message } = data;

  if (!title || !message) {
    return {
      error: "Title and message are required.",
    };
  }

  try {
    // One channel per message: Resend when a key is configured (env or DB),
    // otherwise SMTP.
    const resend = (await getResendApiKey()) ? await resendHelper() : null;

    const users = await prismadb.users.findMany({
      where: { userStatus: "ACTIVE" },
    });

    //For each user, send mail
    for (const user of users) {
      if (!resend) {
        const emailHtml = render(
          MessageToAllUsers({
            title: title,
            message: message,
            username: user?.name!,
          })
        );

        //send via sendmail
        await sendEmail({
          from: process.env.EMAIL_FROM as string,
          to: user.email,
          subject: title,
          text: message,
          html: await emailHtml,
        });
        continue;
      }

      //send via Resend.com
      await resend.emails.send({
        from:
          process.env.NEXT_PUBLIC_APP_NAME +
          " <" +
          process.env.EMAIL_FROM +
          ">",
        to: user?.email!,
        subject: title,
        text: message, // Add this line to fix the types issue
        react: MessageToAllUsers({
          title: title,
          message: message,
          username: user?.name!,
        }),
      });
    }
  } catch (error) {
    console.log(error);
    return {
      error: "Failed to send mail to all users.",
    };
  }

  return { data: { title: title, message: message } };
};

export const sendMailToAll = createSafeAction(SendMailToAll, handler);
