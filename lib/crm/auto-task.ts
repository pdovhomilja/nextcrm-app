import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";

// Task creation for the funnel timer engine. No session context — the
// assignee is the deal's rep; notification is best-effort.
export async function createAutoTask(opts: {
  title: string;
  content: string;
  accountId: string | null;
  opportunityId?: string | null;
  assigneeId: string | null;
  dueDateAt: Date;
}): Promise<{ id: string } | null> {
  const { title, content, accountId, opportunityId, assigneeId, dueDateAt } = opts;
  if (!assigneeId) return null;

  // Idempotency: one open task per (title, deal) — reruns and overlapping
  // schedules must not duplicate work items.
  const existing = await prismadb.crm_Accounts_Tasks.findFirst({
    where: {
      title,
      taskStatus: { in: ["ACTIVE", "PENDING"] },
      ...(opportunityId ? { opportunity_id: opportunityId } : { account: accountId }),
    },
    select: { id: true },
  });
  if (existing) return null;

  const task = await prismadb.crm_Accounts_Tasks.create({
    data: {
      v: 0,
      title,
      content,
      priority: "high",
      taskStatus: "ACTIVE",
      account: accountId ?? undefined,
      opportunity_id: opportunityId ?? undefined,
      user: assigneeId,
      createdBy: assigneeId,
      updatedBy: assigneeId,
      dueDateAt,
    },
  });

  try {
    const assignee = await prismadb.users.findUnique({ where: { id: assigneeId } });
    if (assignee?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: assignee.email,
        subject: `New task - ${title}`,
        text: `${content}\n\nDue: ${dueDateAt.toDateString()}\n${process.env.NEXT_PUBLIC_APP_URL}/crm/tasks/viewtask/${task.id}`,
      });
    }
  } catch (error) {
    console.error("[createAutoTask] notification failed:", error);
  }

  return { id: task.id };
}
