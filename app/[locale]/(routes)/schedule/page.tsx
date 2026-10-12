import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { ScheduleHub } from "./components/ScheduleHub";

export default async function SchedulePage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/sign-in");

  const role = session.user.role;
  const isManager = role === "admin" || role === "manager";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Meetings, conferences (Jitsi + team chat), events, and leave requests. Meetings sync to Google Calendar when
          connected under Profile → Calendar.
        </p>
      </div>
      <ScheduleHub isManager={isManager} />
    </div>
  );
}
