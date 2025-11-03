import { authOptions } from "@/lib/auth";
import { openAiHelper } from "@/lib/openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimited } from "@/middleware/with-rate-limit";

// IMPORTANT! Set the runtime to edge
//export const runtime = "edge";

async function handlePOST(req: NextRequest): Promise<Response> {
  // Extract the `prompt` from the body of the request
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const openai = await openAiHelper(session.user.id);

  if (!openai) {
    return new Response("No openai key found", { status: 500 });
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

// Apply rate limiting to all endpoints
export const POST = rateLimited(handlePOST);
