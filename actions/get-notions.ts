import { Client } from "@notionhq/client";

const notionSecret = process.env.NOTION_API_KEY;
const notionDatabaseId = process.env.NOTION_DATABASE_ID;

const notion = new Client({ auth: notionSecret });

if (!notionSecret || !notionDatabaseId) {
  throw new Error("Notion API Key or Notion Database ID not found");
}

export const getNotions = async () => {
  const response = await notion.databases.query({
    database_id: notionDatabaseId,
  });

  console.log(response);
};

/* import { prismadb } from "@/lib/prisma";
import initNotionClient from "@/lib/notion";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { Session } from "next-auth";
import { Client as NotionClient } from "@notionhq/client";

// Define function outside of try-catch
async function fetchDatabaseItems(
  notion: NotionClient,
  notionDbId: string,
  startCursor?: string
): any {
  const response = await notion.databases.query({
    database_id: notionDbId,
    start_cursor: startCursor,
    page_size: 100,
  });

  const items:  = response.results;

  if (response.has_more) {
    const nextItems:  = await fetchDatabaseItems(
      notion,
      notionDbId,
      response.next_cursor
    );
    return items.concat(nextItems);
  } else {
    return items;
  }
}

export const getNotions = async (): Promise< | null> => {
  const session: Session | null = await getServerSession(authOptions);
  const userId: string | undefined = session?.user?.id;

  if (!userId) {
    return null;
  }

  const notion: NotionClient = await initNotionClient(userId);

  try {
    const notionDb = await prismadb.secondBrain_notions.findFirst({
      where: {
        user: session.user.id,
      },
    });

    if (!notionDb) {
      throw new Error("Notion DB not found");
    }

    const databases:  = await fetchDatabaseItems(
      notion,
      notionDb.notion_db_id
    )
      .then((items: ) => {
        return items;
      })
      .catch((error: any) => {
        console.error(error);
        return [];
      });

    return databases;
  } catch (error) {
    console.log(error);
    return null;
  }
};
 */
