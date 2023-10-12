/*
This API endpoint is used to create a cron job that will send an email to all users with their tasks for the day and the next 7 days.
*/
import { getUserAiTasks } from "@/actions/cron/get-user-ai-tasks";
import { prismadb } from "@/lib/prisma";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  /*
This endpoint is not available in the demo version of NextCRM.
*/
  if (process.env.NEXT_PUBLIC_APP_URL === "demo.nextcrm.io") {
    return NextResponse.json({
      message: "AI assistant is not available in Demo version",
    });
  }

  try {
    const users = await prismadb.users.findMany({
      where: {
        userStatus: "ACTIVE",
      },
    });

    if (!users) return NextResponse.json({ message: "No users found" });

    for (const user of users) {
      const action = await getUserAiTasks(user.id);
      if (action.message!) {
        console.log(action.message);
        return NextResponse.json({ message: action.message });
      }
      if (action.user) {
        console.log("Emails sent to:", action.user);
        return NextResponse.json({ message: "Emails sent to:" + action.user });
      }
    }
  } catch (error) {
    console.log("[TASK_CRON_API]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
