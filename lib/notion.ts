import { Client } from "@notionhq/client";
import { prismadb } from "./prisma";
import { error } from "console";

const initNotionClient = async (userId: string) => {
  try {
    const apiKey = await prismadb.secondBrain_notions.findFirst({
      where: {
        user: userId,
      },
    });

    if (!apiKey) {
      const notionItems: any = {
        error: "API key not found in the database.",
      };
      return notionItems;
    }

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
