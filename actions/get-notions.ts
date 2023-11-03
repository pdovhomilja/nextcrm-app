import { prismadb } from "@/lib/prisma";
import initNotionClient from "@/lib/notion";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { Session } from "next-auth";
import { Client as NotionClient } from "@notionhq/client";
import moment from "moment";

type NotionItem = {
  id: string;
  createdAt: string;
  title: string;
  urlShort: string;
  url: string;
};

async function fetchDatabaseItems(
  notion: NotionClient,
  notionDbId: string,
  startCursor?: string
) {
  const response = await notion.databases.query({
    database_id: notionDbId,
    start_cursor: startCursor,
    page_size: 100,
  });

  const items = response.results;

  if (response.has_more) {
    const nextItems: any[] = await fetchDatabaseItems(
      notion,
      notionDbId,
      response.next_cursor || ""
    );
    return items.concat(nextItems);
  } else {
    return items;
  }
}

export const getNotions = async (): Promise<any[] | null> => {
  const session: Session | null = await getServerSession(authOptions);
  const userId: string | undefined = session?.user?.id;

  if (!userId) {
    return null;
  }

  const notion: NotionClient = await initNotionClient(userId);

  //console.log(notion, "notion");

  try {
    const notionDb = await prismadb.secondBrain_notions.findFirst({
      where: {
        user: session?.user.id,
      },
    });

    if (!notionDb) {
      const notionItems: any = {
        error: "API key not found in the database.",
      };
      //return notionItems;
      console.log("User has no notion database enabled yet.");
      return notionItems;
    }

    const databases: any[] = await fetchDatabaseItems(
      notion,
      notionDb.notion_db_id
    )
      .then((items: any[]) => {
        return items;
      })
      .catch((error: any) => {
        //console.error(error);
        const notionItems: any = {
          error: "API key is invalid.",
        };
        return notionItems;
      });

    const notionItems = databases.map(
      (item:any) =>
        ({
          id: item.id,
          createdAt: moment(item.created_time).format("YYYY-MM-DD"),
          title:
            item.properties.Tweet.title[0].plain_text.substring(0, 60) + " ...",
          urlShort:
            item.properties["Tweet Link"]?.url?.substring(0, 40) + " ...",
          url: item.properties["Tweet Link"]?.url,
        } as NotionItem)
    );

    return notionItems;
  } catch (error) {
    console.log(error);
    return null;
  }
};
