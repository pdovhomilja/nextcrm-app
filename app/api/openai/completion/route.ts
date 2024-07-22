import { authOptions } from "@/lib/auth";
import { openAiHelper } from "@/lib/openai";
import { getServerSession } from "next-auth";
import type { NextRequest, NextResponse as NR } from 'next/server';
import { NextResponse } from 'next/server';
import OpenAI from "openai";

export async function POST(req: NextRequest): Promise<NR> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = await openAiHelper(session.user.id);

  if (!openai) {
    return NextResponse.json({ error: "No OpenAI key found" }, { status: 500 });
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
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
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
