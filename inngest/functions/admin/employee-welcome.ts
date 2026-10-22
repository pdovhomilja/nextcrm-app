import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";
import { getPublicAppUrl } from "@/lib/app-url";
import EmployeeWelcomeEmail from "@/emails/EmployeeWelcome";
import { getAppName } from "@/lib/app-name";

export const adminEmployeeWelcomeEmail = inngest.createFunction(
  {
    id: "admin-employee-welcome-email",
    name: "Admin: Employee welcome email",
    retries: 3,
    triggers: [{ event: "admin/employee-welcome-email" }],
  },
  async ({ event }) => {
    const {
      userId,
      personalEmail,
      workEmail,
      displayName,
      temporaryPassword,
      mustChange,
      inviterId,
    } = event.data as {
      userId: string;
      personalEmail: string;
      workEmail: string;
      displayName: string;
      temporaryPassword: string;
      mustChange: boolean;
      inviterId: string;
    };

    const fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "";
    if (!fromAddress) throw new Error("EMAIL_FROM / RESEND_FROM_EMAIL not configured");

    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { id: true, userStatus: true },
    });
    if (!user || user.userStatus !== "ACTIVE") {
      return { skipped: "user_not_active" };
    }

    const inviter = await prismadb.users.findUnique({
      where: { id: inviterId },
      select: { name: true },
    });

    const resend = await resendHelper();
    const appName = getAppName();
    await resend.emails.send({
      from: `${appName} <${fromAddress}>`,
      to: personalEmail,
      subject: `Your ${appName} login — ${workEmail}`,
      react: EmployeeWelcomeEmail({
        displayName,
        workEmail,
        personalEmail,
        temporaryPassword,
        mustChange,
        invitedByName: inviter?.name || "Your administrator",
        appUrl: getPublicAppUrl(),
        appName,
      }),
    });

    return { sent: true };
  }
);
