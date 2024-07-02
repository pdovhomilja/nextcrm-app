import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

import { openAiHelper } from "@/lib/openai";

export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt, userId } = body;

  const openai = await openAiHelper(userId);

  if (!openai) {
    return new NextResponse("No openai key found", { status: 500 });
  }

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
        { role: "system", content: "You are a helpful executive assistant working for Windrose and Company, a business consultancy. They specialize in business process architecture, business system modernization, and scaling small businesses in a sane way. Use the access you're given to the internet and also to answer the executives questions. You should remain polite, direct, and never assume but always thoroughly research, then vet, THEN share your vetted answers only." },
        { role: "user", content: prompt },
      ],
      model: gptModel[0].model,
      temperature: 0,
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
