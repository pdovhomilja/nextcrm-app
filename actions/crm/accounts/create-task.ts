"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import resendHelper from "@/lib/resend";
import NewTaskFromCRMEmail from "@/emails/NewTaskFromCRM";
import NewTaskFromCRMToWatchersEmail from "@/emails/NewTaskFromCRMToWatchers";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const createTask = async (data: {
  title: string;
  user: string;
  priority: string;
  content: string;
  account: string;
  dueDateAt?: Date;
}) => {
  // getSession stays for the notification-email fields (name, userLanguage)
  // that the AuthzUser does not carry.
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { title, user, priority, content, account, dueDateAt } = data;

  if (!title || !user || !priority || !content || !account) {
    return { error: "Missing one of the task data" };
  }

  // Parent-write: creating a task under an account requires write on that account.
  let authUser;
  try {
    authUser = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteAccount(authUser, account);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  let resend;
  try {
    resend = await resendHelper();
  } catch (error: any) {
    return { error: error?.message || "Resend API key is not configured" };
  }

  try {
    const task = await prismadb.crm_Accounts_Tasks.create({
      data: {
        v: 0,
        priority,
        title,
        content,
        account,
        dueDateAt,
        // createdBy/updatedBy = the authenticated caller (was previously the
        // spoofable input `user` field); `user` remains the task assignee.
        createdBy: authUser.id,
        updatedBy: authUser.id,
        user,
        taskStatus: "ACTIVE",
      },
    });

    // Notification to user who is not a task creator
    if (user !== session.user.id) {
      try {
        const notifyRecipient = await prismadb.users.findUnique({
          where: { id: user },
        });

        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: notifyRecipient?.email!,
          subject:
            session.user.userLanguage === "en"
              ? `New task - ${title}.`
              : `Nový úkol - ${title}.`,
          text: "",
          react: NewTaskFromCRMEmail({
            taskFromUser: session.user.name!,
            username: notifyRecipient?.name!,
            userLanguage: notifyRecipient?.userLanguage!,
            taskData: task,
          }),
        });
      } catch (error) {
        console.log(error);
      }
    }

    // Notification to account watchers
    try {
      const accountWatchers = await prismadb.accountWatchers.findMany({
        where: {
          account_id: account,
          user_id: { not: session.user.id },
        },
        include: { user: true },
      });

      for (const watcher of accountWatchers) {
        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: watcher.user?.email!,
          subject:
            session.user.userLanguage === "en"
              ? `New task - ${title}.`
              : `Nový úkol - ${title}.`,
          text: "",
          react: NewTaskFromCRMToWatchersEmail({
            taskFromUser: session.user.name!,
            username: watcher.user?.name!,
            userLanguage: watcher.user?.userLanguage!,
            taskData: task,
          }),
        });
      }
    } catch (error) {
      console.log(error);
    }

    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    return { data: task };
  } catch (error) {
    console.log("[CREATE_TASK]", error);
    return { error: "Failed to create task" };
  }
};
