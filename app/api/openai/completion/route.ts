import { authOptions } from "@/lib/auth";
import { openAiHelper } from "@/lib/openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { getServerSession } from "next-auth";
import OpenAI from "openai";

// IMPORTANT! Set the runtime to edge
//export const runtime = "edge";

export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const openai = await openAiHelper(session.user.id);

  if (!openai) {
    const errorResponse = new Response("No openai key found", { status: 500 });
    const stream = OpenAIStream(errorResponse);
    return new StreamingTextResponse(stream);
  }

  //console.log(session, "session");

  const { prompt } = await req.json();

  // Ask OpenAI for a streaming completion given the prompt
  const response = await openai.completions.create({
    model: "gpt-3.5-turbo-instruct",
    max_tokens: 2000,
    stream: true,
    prompt,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  return new StreamingTextResponse(stream);
}
