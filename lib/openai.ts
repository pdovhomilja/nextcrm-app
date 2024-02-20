import OpenAI from "openai";
import { prismadb } from "./prisma";

//Check if the openai key is in the database
//If not, use the env variable

export async function openAiHelper(userId: string) {
  //Check if the App instance has an openai key
  const openAiKey = await prismadb.systemServices.findFirst({
    where: {
      name: "openAiKey",
    },
  });

  //Check if the user has a private openai key
  const userOpenAiKey = await prismadb.openAi_keys.findFirst({
    where: {
      user: userId,
    },
  });

  let apiKey = openAiKey?.serviceKey || userOpenAiKey?.api_key;

  if (!apiKey) {
    if (!process.env.OPENAI_API_KEY) {
      console.log("No API key found in the environment");
      return null;
      //throw new Error("OPEN_AI_API_KEY is not defined in the environment");
    }
    apiKey = process.env.OPENAI_API_KEY;
  }

  //console.log(apiKey, "apiKey");
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  return openai;
}
