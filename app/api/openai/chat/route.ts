// app/api/chat/route.ts

import { openai } from "@/lib/openai";
import { OpenAIStream, StreamingTextResponse } from "ai";

// Optional, but recommended: run on the edge runtime.
// See https://vercel.com/docs/concepts/functions/edge-functions
export const runtime = "edge";

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  /*   const { messages } = await req.json();

  // Request the OpenAI API for the response based on the prompt
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    stream: true,
    messages: messages,
  });

  console.log(response, "response");

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  return new StreamingTextResponse(stream); */
  return new Response("Hello world");
}
