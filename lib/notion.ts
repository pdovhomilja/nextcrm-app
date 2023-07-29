import { Client } from "@notionhq/client";
import { prismadb } from "./prisma";
import { error } from "console";

const initNotionClient = async (userId: string) => {
  //console.log(userId, "User ID from Notion - lib");

  try {
    const apiKey = await prismadb.secondBrain_notions.findFirst({
      where: {
        user: userId,
      },
    });

    //console.log(apiKey, "API key from Notion - lib");

    if (!apiKey) {
      const notionItems: any = {
        error: "API key not found in the database.",
      };
      console.log(error);
      return notionItems;
      //throw new Error("API key not found in the database.");
    }

    //console.log(apiKey, "API key from Notion - lib");

    const notion = new Client({
      auth: apiKey.notion_api_key,
    });

    return notion;
  } catch (error) {
    console.error("Failed to initialize Notion client:", error);
    throw error;
  }
};

export default initNotionClient;
