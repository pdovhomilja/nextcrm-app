import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    return NextResponse.json("success", { status: 200 });
  } catch (error) {
    console.log("[USERS_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
/* import { Configuration, OpenAIApi } from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

// Set the runtime to edge for best performance
//export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  //  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  //console.log(ip, "ip");

  // Create an empty object to store headers
  const headers: { [key: string]: string } = {};

  // Iterate over each header and add it to the headers object
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const newPromptHistoryItem = await prismadb.promptsHistory.create({
    data: {
      prompt: prompt,
      user_ip: headers["x-forwarded-for"],
      user_browser: headers["user-agent"],
    },
  });

  //console.log(headers, "headers");

  const template = await prismadb.prompts.findMany({
    where: {
      status: "ACTIVE",
    },
  });

  const templateUseCount = await prismadb.prompts.findMany({
    where: {
      id: template[0].id,
    },
  });

  await prismadb.prompts.update({
    where: {
      id: template[0].id,
    },
    data: {
      use_count: templateUseCount[0].use_count + 1,
    },
  });

  // Ask OpenAI for a streaming completion given the prompt
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    stream: true,
    temperature: 0,
    max_tokens: 2000,
    prompt: template[0].prompt + prompt,
  });
  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response, {
    onCompletion: async (completion: string) => {
      // This callback is called when the stream completes
      // You can use this to save the final completion to your database
      await prismadb.promptsHistory.update({
        where: {
          id: newPromptHistoryItem.id,
        },
        data: {
          response: completion,
        },
      });
    },
  });
  // Respond with the stream
  return new StreamingTextResponse(stream);
}
 */
