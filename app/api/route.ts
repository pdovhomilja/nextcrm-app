import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const tasks = await prismadb.tasks.updateMany({
    where: {
      id: "646b6846bda10d40bb61df77",
    },
    data: {
      dueDateAt: new Date(),
      taskStatus: "ACTIVE",
    },
  });

  return NextResponse.json(tasks, { status: 200 });
}
