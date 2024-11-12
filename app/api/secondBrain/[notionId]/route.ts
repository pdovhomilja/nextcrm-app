import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import initNotionClient from "@/lib/notion";

export async function DELETE(req: Request, props: { params: Promise<{ notionId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const notion = await initNotionClient(session?.user?.id!);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    //Get the notion database id from the user's profile in the database
    const notionDb = await prismadb.secondBrain_notions.findFirst({
      where: {
        user: session.user.id,
      },
    });

    const { notionId } = params;

    console.log(notionId, "notionId");

    await deleteTweet(notion, notionId, notionDb?.notion_db_id!);

    const databases = await fetchDatabases(notion, notionDb?.notion_db_id!);

    return NextResponse.json({ message: "Account deleted" }, { status: 200 });
  } catch (error) {
    console.log("[Account_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

async function deleteTweet(notion: any, notionId: string, notionDb: string) {
  try {
    const response = await notion.pages.update({
      page_id: notionId,
      archived: true,
      parent: {
        database_id: notionDb,
      },
    });
    console.log(
      `Tweet with ID ${notionId} has been deleted from the ${notionDb} database.`
    );
    return response;
  } catch (error: any) {
    console.error(error.body);
  }
}

async function fetchDatabases(notion: any, notionDb: string) {
  const response = await notion.databases.query({
    // database_id: process.env.NOTION_DATABASE_ID,
    database_id: notionDb,
  });
  const databases = response.results;
  //console.log("Databases:", databases);
  return databases;
}
