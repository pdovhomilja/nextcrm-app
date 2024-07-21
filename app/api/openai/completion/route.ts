import { authOptions } from "@/lib/auth";
import { openAiHelper } from "@/lib/openai";
import { getServerSession } from "next-auth";
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import OpenAI from "openai";

// Conditionally set runtime based on the base URL
const isLocalhost = () => {
  return process.env.NEXT_PUBLIC_BASE_URL === 'http://localhost:3000';
};

export const config = {
  runtime: isLocalhost() ? undefined : 'edge',
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = await openAiHelper(session.user.id);

  if (!openai) {
    return NextResponse.json({ error: "No openai key found" }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Invalid value for 'prompt': expected a non-empty string." }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: "You are an executive assistant to a nonprofit. You are responsible for providing helpful, supportive guidance to end users and to case managers in forming well-crafted plans out of the available resource landscape to help guide clients to better outcomes.",
        },
        { role: "user", content: prompt },
      ],
      stream: true, // Enable streaming
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || ""; // Extract the text content
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    console.error("Error in OpenAI API request:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to process the request." }, { status: 500 });
  }
}
