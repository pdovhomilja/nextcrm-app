import OpenAI from "openai";
import { getApiKey } from "./api-keys";

//Check if the openai key is in the database
//If not, use the env variable

export async function openAiHelper(userId: string) {
  const apiKey = await getApiKey("OPENAI", userId);

  if (!apiKey) {
    console.log("No API key found in the environment");
    return null;
  }

  //console.log(apiKey, "apiKey");
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  return openai;
}
