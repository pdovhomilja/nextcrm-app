import type { NotifyInput } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import resendHelper from "@/lib/resend";
import { mapLegacyRole } from "@/lib/authz/roles";

export async function sendPluginNotification(pluginId: string, input: NotifyInput): Promise<void> {
  const users = await prismaBase.users.findMany({ where: { userStatus: "ACTIVE" }, select: { id: true, email: true, role: true } });
  const roles = new Set<string>(input.roles ?? []);
  const ids = new Set(input.userIds ?? []);
  const to = users
    .filter((u) => u.email && (ids.has(u.id) || roles.has(mapLegacyRole(u.role))))
    .map((u) => u.email);
  if (!to.length) return;
  const resend = await resendHelper();
  // One message per recipient: recipients must not see each other's addresses.
  for (const email of to) {
    await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: input.subject,
      text: input.text,
    });
  }
}
