// app/api/chat/route.ts

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt } = body;

  if (!prompt) {
    return new NextResponse("No prompt", { status: 400 });
  }

  try {
    const gptModel = await prismadb.gpt_models.findMany({
      where: {
        status: "ACTIVE",
      },
    });

    //console.log("Active GPT Model:", gptModel[0].model);

    //console.log(prompt, "prompt");
    // Ask OpenAI for a chats completion given the prompt
    const response = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      model: gptModel[0].model,
    });

    return NextResponse.json(
      { response: response.choices[0] },
      { status: 200 }
    );
  } catch (error) {
    console.log("[OPENAI_CHAT_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
